package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"notion-backend/internal/models"
	"notion-backend/internal/repository"

	"notion-backend/internal/services"
	"github.com/go-chi/chi/v5"
)

type DocumentHandler struct {
	repo     *repository.DocumentRepository
	importer *services.NotionImporter
}

func NewDocumentHandler(repo *repository.DocumentRepository) *DocumentHandler {
	return &DocumentHandler{
		repo:     repo,
		importer: services.NewNotionImporter(),
	}
}

// Routes sets up document routes
func (h *DocumentHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/tree", h.GetTree)
	r.Get("/archived", h.GetArchived)
	r.Post("/", h.Create)
	r.Post("/import", h.ImportFromURL)
	r.Post("/{id}/restore", h.Restore)
	r.Delete("/{id}/permanent", h.HardDelete)
	r.Get("/{id}", h.GetByID)
	r.Patch("/{id}", h.Update)
	r.Delete("/{id}", h.Archive)

	r.Get("/backup", h.ExportBackup)
	r.Post("/restore", h.ImportBackup)

	return r
}

func (h *DocumentHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	tree, err := h.repo.GetTree(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tree)
}

func (h *DocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID       *string `json:"id"`
		Title    string  `json:"title"`
		ParentID *string `json:"parent_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	doc, err := h.repo.Create(ctx, payload.ID, payload.Title, payload.ParentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	doc, err := h.repo.GetByID(ctx, id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var payload models.DocUpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.repo.Update(ctx, id, payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.repo.Archive(ctx, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) ImportFromURL(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		URL      string  `json:"url"`
		ParentID *string `json:"parent_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	title, blocks, err := h.importer.ImportURL(payload.URL)
	if err != nil {
		http.Error(w, "Failed to import from Notion: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	doc, err := h.repo.Create(ctx, nil, title, payload.ParentID)
	if err != nil {
		http.Error(w, "Failed to create document: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var contentInterface interface{} = blocks

	updatePayload := models.DocUpdatePayload{
		Content: &contentInterface,
	}

	if err := h.repo.Update(ctx, doc.ID, updatePayload); err != nil {
		http.Error(w, "Failed to save block content: "+err.Error(), http.StatusInternalServerError)
		return
	}

	doc.Content = contentInterface
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) GetArchived(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	docs, err := h.repo.GetArchived(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

func (h *DocumentHandler) Restore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.repo.Restore(ctx, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) HardDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.repo.HardDelete(ctx, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) ExportBackup(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	docs, err := h.repo.ExportAll(ctx)
	if err != nil {
		http.Error(w, "Failed to export backup: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=\"notion_backup.json\"")
	json.NewEncoder(w).Encode(docs)
}

func (h *DocumentHandler) ImportBackup(w http.ResponseWriter, r *http.Request) {
	var docs []models.Document
	if err := json.NewDecoder(r.Body).Decode(&docs); err != nil {
		http.Error(w, "Invalid backup format: "+err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	if err := h.repo.ImportAll(ctx, docs); err != nil {
		http.Error(w, "Failed to import backup: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Backup restored successfully"}`))
}
