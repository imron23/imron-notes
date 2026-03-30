package models

import (
	"encoding/json"
	"time"
)

// Document object corresponding to the DB schema
type Document struct {
	ID         string                 `json:"id"`
	ParentID   *string                `json:"parent_id"` // null if root
	Title      string                 `json:"title"`
	Icon       *string                `json:"icon,omitempty"`
	CoverImage *string                `json:"cover_image,omitempty"`
	Content    json.RawMessage        `json:"content,omitempty"` // json parser mapping
	IsArchived bool                   `json:"is_archived"`
	CreatedAt  time.Time              `json:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at"`
}

// SidebarItem represents the tree structure returned to the frontend
type SidebarItem struct {
	ID       string        `json:"id"`
	ParentID *string       `json:"parent_id"`
	Title    string        `json:"title"`
	Icon     *string       `json:"icon,omitempty"`
	Children []SidebarItem `json:"children"`
}

// DocUpdatePayload represents flexible partial updates
type DocUpdatePayload struct {
	Title      *string          `json:"title,omitempty"`
	ParentID   **string         `json:"parent_id,omitempty"` // Double pointer to distinguish omitted vs null
	Icon       *string          `json:"icon,omitempty"`
	CoverImage *string          `json:"cover_image,omitempty"`
	Content    *json.RawMessage `json:"content,omitempty"`
}
