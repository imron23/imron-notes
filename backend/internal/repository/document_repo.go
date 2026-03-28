package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"notion-backend/internal/db"
	"notion-backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type DocumentRepository struct {
	database *db.Database
}

func NewDocumentRepository(database *db.Database) *DocumentRepository {
	return &DocumentRepository{database: database}
}

const treeCacheKey = "workspace:sidebar_tree"

// InvalidateTreeCache clears the tree cache in Redis
func (r *DocumentRepository) InvalidateTreeCache(ctx context.Context) {
	err := r.database.Redis.Del(ctx, treeCacheKey).Err()
	if err != nil {
		log.Printf("Failed to invalidate tree cache: %v\n", err)
	}
}

// GetTree returns the entire document sidebar hierarchy
func (r *DocumentRepository) GetTree(ctx context.Context) ([]models.SidebarItem, error) {
	// Check Redis cache
	cached, err := r.database.Redis.Get(ctx, treeCacheKey).Result()
	if err == nil && cached != "" {
		var tree []models.SidebarItem
		if err := json.Unmarshal([]byte(cached), &tree); err == nil {
			return tree, nil
		}
	}

	// Wait, standard WITH RECURSIVE in Postgres returning flat results 
	// is easier to reconstruct in Go rather than complex jsonb_object_agg in sql
	query := `
		SELECT id, parent_id, title, icon 
		FROM documents 
		WHERE is_archived = false 
		ORDER BY created_at ASC
	`
	
	rows, err := r.database.Pg.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.SidebarItem{}
	for rows.Next() {
		var item models.SidebarItem
		if err := rows.Scan(&item.ID, &item.ParentID, &item.Title, &item.Icon); err != nil {
			return nil, err
		}
		item.Children = []models.SidebarItem{} // Initialize to avoid null in json
		items = append(items, item)
	}

	// Build tree in memory for blazing fast frontend
	tree := buildTree(items, nil)

	// Cache result in Redis
	jsonBytes, _ := json.Marshal(tree)
	r.database.Redis.Set(ctx, treeCacheKey, string(jsonBytes), 24*time.Hour)

	return tree, nil
}

// buildTree creates a nested structure from flat array
func buildTree(items []models.SidebarItem, parentID *string) []models.SidebarItem {
	var result []models.SidebarItem
	for _, item := range items {
		if (parentID == nil && item.ParentID == nil) || (parentID != nil && item.ParentID != nil && *item.ParentID == *parentID) {
			item.Children = buildTree(items, &item.ID)
			result = append(result, item)
		}
	}
	if result == nil {
		return []models.SidebarItem{}
	}
	return result
}

// Create makes a new document. If id is provided, it uses it, otherwise it uses gen_random_uuid() backing.
func (r *DocumentRepository) Create(ctx context.Context, id *string, title string, parentID *string) (*models.Document, error) {
	var query string
	var row pgx.Row
	
	if id != nil {
		query = `
			INSERT INTO documents (id, title, parent_id) 
			VALUES ($1, $2, $3)
			RETURNING id, parent_id, title, icon, cover_image, content, is_archived, created_at, updated_at
		`
		row = r.database.Pg.QueryRow(ctx, query, *id, title, parentID)
	} else {
		query = `
			INSERT INTO documents (title, parent_id) 
			VALUES ($1, $2)
			RETURNING id, parent_id, title, icon, cover_image, content, is_archived, created_at, updated_at
		`
		row = r.database.Pg.QueryRow(ctx, query, title, parentID)
	}
	
	var d models.Document
	err := row.Scan(&d.ID, &d.ParentID, &d.Title, &d.Icon, &d.CoverImage, &d.Content, &d.IsArchived, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Cache invalidation (Creation affects Sidebar)
	r.InvalidateTreeCache(ctx)
	return &d, nil
}

// GetByID returns a document by ID including its heavy JSONB content
func (r *DocumentRepository) GetByID(ctx context.Context, id string) (*models.Document, error) {
	query := `
		SELECT id, parent_id, title, icon, cover_image, content, is_archived, created_at, updated_at 
		FROM documents 
		WHERE id = $1 AND is_archived = false
	`
	row := r.database.Pg.QueryRow(ctx, query, id)
	var d models.Document
	err := row.Scan(&d.ID, &d.ParentID, &d.Title, &d.Icon, &d.CoverImage, &d.Content, &d.IsArchived, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("document not found")
	}
	return &d, err
}

// Update mutates partial fields
func (r *DocumentRepository) Update(ctx context.Context, id string, payload models.DocUpdatePayload) error {
	// Dynamically build the UPDATE statement
	args := []interface{}{}
	query := `UPDATE documents SET updated_at = CURRENT_TIMESTAMP`
	
	argIdx := 1
	invalidateCache := false // Only invalidate tree if title, icon, or parent_id changes

	if payload.Title != nil {
		query += fmt.Sprintf(", title = $%d", argIdx)
		args = append(args, *payload.Title)
		argIdx++
		invalidateCache = true
	}
	
	if payload.ParentID != nil {
		query += fmt.Sprintf(", parent_id = $%d", argIdx)
		args = append(args, *payload.ParentID) // *payload.ParentID is *string (which can be nil)
		argIdx++
		invalidateCache = true
	}

	if payload.Icon != nil {
		query += fmt.Sprintf(", icon = $%d", argIdx)
		args = append(args, *payload.Icon)
		argIdx++
		invalidateCache = true
	}

	if payload.CoverImage != nil {
		query += fmt.Sprintf(", cover_image = $%d", argIdx)
		args = append(args, *payload.CoverImage)
		argIdx++
	}

	if payload.Content != nil {
		query += fmt.Sprintf(", content = $%d", argIdx)
		args = append(args, *payload.Content)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d AND is_archived = false", argIdx)
	args = append(args, id)

	_, err := r.database.Pg.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if invalidateCache {
		r.InvalidateTreeCache(ctx)
	}

	return nil
}

// Archive soft-deletes the document
func (r *DocumentRepository) Archive(ctx context.Context, id string) error {
	// The DB trigger trg_documents_cascade_archive takes care of cascading to children!
	query := `UPDATE documents SET is_archived = true WHERE id = $1 AND is_archived = false`
	_, err := r.database.Pg.Exec(ctx, query, id)
	if err == nil {
		r.InvalidateTreeCache(ctx)
	}
	return err
}

// GetArchived returns all soft-deleted documents
func (r *DocumentRepository) GetArchived(ctx context.Context) ([]models.Document, error) {
	query := `
		SELECT id, parent_id, title, icon, created_at, updated_at
		FROM documents
		WHERE is_archived = true
		ORDER BY updated_at DESC
	`
	rows, err := r.database.Pg.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch archived docs: %w", err)
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var doc models.Document
		if err := rows.Scan(&doc.ID, &doc.ParentID, &doc.Title, &doc.Icon, &doc.CreatedAt, &doc.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	
	if docs == nil {
		docs = make([]models.Document, 0)
	}
	return docs, nil
}

// Restore reverts a soft delete
func (r *DocumentRepository) Restore(ctx context.Context, id string) error {
	query := `UPDATE documents SET is_archived = false, parent_id = NULL, updated_at = NOW() WHERE id = $1`
	_, err := r.database.Pg.Exec(ctx, query, id) // Restores it to root to avoid floating missing parents
	if err != nil {
		return fmt.Errorf("failed to restore document: %w", err)
	}

	r.InvalidateTreeCache(ctx)
	return nil
}

// HardDelete permanently removes a document
func (r *DocumentRepository) HardDelete(ctx context.Context, id string) error {
	query := `DELETE FROM documents WHERE id = $1`
	// Due to ON DELETE CASCADE in db schema, this drops all children automatically
	_, err := r.database.Pg.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to hard delete document: %w", err)
	}

	return nil
}

// ExportAll returns the complete database of documents for backup
func (r *DocumentRepository) ExportAll(ctx context.Context) ([]models.Document, error) {
	query := `
		SELECT id, parent_id, title, icon, cover_image, content, is_archived, created_at, updated_at
		FROM documents
	`
	rows, err := r.database.Pg.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to export docs: %w", err)
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var doc models.Document
		if err := rows.Scan(&doc.ID, &doc.ParentID, &doc.Title, &doc.Icon, &doc.CoverImage, &doc.Content, &doc.IsArchived, &doc.CreatedAt, &doc.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	
	if docs == nil {
		docs = []models.Document{}
	}
	return docs, nil
}

// ImportAll completely replaces or merges the database from a backup
func (r *DocumentRepository) ImportAll(ctx context.Context, docs []models.Document) error {
	tx, err := r.database.Pg.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// To handle foreign key constraints safely regardless of array order,
	// we do this in two passes: 
	// 1. Insert/Update all without parent_id.
	// 2. Set the proper parent_id.

	for _, doc := range docs {
		query1 := `
			INSERT INTO documents (id, title, icon, cover_image, content, is_archived, created_at, updated_at) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (id) DO UPDATE SET 
				title = EXCLUDED.title,
				icon = EXCLUDED.icon,
				cover_image = EXCLUDED.cover_image,
				content = EXCLUDED.content,
				is_archived = EXCLUDED.is_archived,
				created_at = EXCLUDED.created_at,
				updated_at = EXCLUDED.updated_at
		`
		_, err := tx.Exec(ctx, query1, doc.ID, doc.Title, doc.Icon, doc.CoverImage, doc.Content, doc.IsArchived, doc.CreatedAt, doc.UpdatedAt)
		if err != nil {
			return fmt.Errorf("pass 1 fail on doc %s: %w", doc.ID, err)
		}
	}

	for _, doc := range docs {
		if doc.ParentID != nil {
			query2 := `UPDATE documents SET parent_id = $1 WHERE id = $2`
			_, err := tx.Exec(ctx, query2, doc.ParentID, doc.ID)
			if err != nil {
				return fmt.Errorf("pass 2 fail on doc %s: %w", doc.ID, err)
			}
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}

	r.InvalidateTreeCache(ctx)
	return nil
}

