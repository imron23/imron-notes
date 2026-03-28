import React, { useState } from 'react';
import type { DocumentMeta } from '../../types';
import { useDocumentStore } from '../../store/useDocumentStore';
import { ChevronRight, ChevronDown, Trash2, Plus, FileText, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SidebarItemProps { item: DocumentMeta; depth: number; }

export default function SidebarItem({ item, depth }: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { activeDocumentId, setActiveDocument, addDocument } = useDocumentStore();
  const navigate = useNavigate();

  const isActive = activeDocumentId === item.id;
  const hasChildren = item.children && item.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded((p) => !p); };
  const handleSelect = () => { setActiveDocument(item.id); navigate('/'); };
  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = addDocument(item.id);
    setIsExpanded(true); setActiveDocument(newId);
  };
  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = addDocument(item.id);
    useDocumentStore.getState().renameDocument(newId, 'New Folder');
    useDocumentStore.getState().updateIcon(newId, '📁');
    setIsExpanded(true); setActiveDocument(newId);
  };
  const handleDragStart = (e: React.DragEvent) => { e.stopPropagation(); e.dataTransfer.setData('documentId', item.id); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('documentId');
    if (draggedId && draggedId !== item.id) { useDocumentStore.getState().moveDocument(draggedId, item.id); setIsExpanded(true); }
  };

  const cls = ['sb-tree-item'];
  if (isActive) cls.push('active');
  if (isDragOver) cls.push('drag-over');
  if (isHovered) cls.push('hovered');

  return (
    <div>
      <div
        role="button" draggable
        onDragStart={handleDragStart} onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cls.join(' ')}
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <button onClick={handleToggle} className="sb-tree-caret">
          {hasChildren
            ? isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            : <div style={{ width: 12, height: 12 }} />}
        </button>

        <span className="sb-tree-icon">
          {item.icon ? item.icon : <FileText size={14} />}
        </span>

        <span className="sb-truncate">{item.title || 'Untitled'}</span>

        <div className="sb-tree-actions" style={{ opacity: isHovered ? 1 : 0 }}>
          {[
            { icon: <Trash2 size={11} />, title: 'Delete', onClick: (e: React.MouseEvent) => { e.stopPropagation(); useDocumentStore.getState().deleteDocument(item.id); } },
            { icon: <FolderPlus size={11} />, title: 'New folder inside', onClick: handleCreateFolder },
            { icon: <Plus size={11} />, title: 'Add sub-page', onClick: handleAddChild },
          ].map((btn) => (
            <button key={btn.title} title={btn.title} onClick={btn.onClick} className="sb-tree-action-btn">
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="sb-tree-children" style={{ marginLeft: depth * 14 + 20 }}>
          {item.children!.map((child) => <SidebarItem key={child.id} item={child} depth={0} />)}
        </div>
      )}
    </div>
  );
}
