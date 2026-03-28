CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    icon VARCHAR(50),
    cover_image TEXT,
    content JSONB,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Recursive trigger to auto-archive children when a parent is archived
-- This ensures the soft-delete cascades properly
CREATE OR REPLACE FUNCTION cascade_archive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_archived AND NOT OLD.is_archived THEN
        -- Mark all direct and nested children as archived
        WITH RECURSIVE children AS (
            SELECT id FROM documents WHERE parent_id = NEW.id
            UNION ALL
            SELECT d.id FROM documents d INNER JOIN children c ON d.parent_id = c.id
        )
        UPDATE documents SET is_archived = true WHERE id IN (SELECT id FROM children);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_documents_cascade_archive
AFTER UPDATE OF is_archived ON documents
FOR EACH ROW
EXECUTE FUNCTION cascade_archive();
