import React, { useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';
import { Star, Clock, MoreHorizontal, Menu, Share2, ChevronRight, Printer, Keyboard, Type } from 'lucide-react';
import type { DocumentMeta } from '../../types';
import ShareModal from './ShareModal';
import HistoryModal from './HistoryModal';
import ShortcutsModal from '../sidebar/ShortcutsModal';

const FONT_OPTIONS = [
  { value: 'default', label: 'Default', family: 'ui-sans-serif, system-ui, sans-serif' },
  { value: 'Inter', label: 'Inter', family: 'Inter, sans-serif' },
  { value: 'Roboto', label: 'Roboto', family: 'Roboto, sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
  { value: 'Lato', label: 'Lato', family: 'Lato, sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif' },
  { value: 'Noto Sans', label: 'Noto Sans', family: '"Noto Sans", sans-serif' },
  { value: 'Ubuntu', label: 'Ubuntu', family: 'Ubuntu, sans-serif' },
  { value: 'Merriweather', label: 'Merriweather', family: 'Merriweather, serif' },
  { value: 'Playfair Display', label: 'Playfair', family: '"Playfair Display", serif' },
  { value: 'Source Code Pro', label: 'Source Code', family: '"Source Code Pro", monospace' },
];

export default function Topbar() {
  const { isSidebarOpen, toggleSidebar, activeModal, setActiveModal, toggleFavorite, isFavorite } = useUIStore();
  const { activeDocumentId, documents } = useDocumentStore();
  const editorFont = useUIStore((s) => s.editorFont);
  const setEditorFont = useUIStore((s) => s.setEditorFont);
  const [starAnimating, setStarAnimating] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handlePrint = () => {
    setShowMoreMenu(false);

    // Find document title for print header
    const getCrumbs = (docs: typeof documents, tid: string, path: any[] = []): any[] | null => {
      for (const d of docs) {
        if (d.id === tid) return [...path, d];
        if (d.children) { const f = getCrumbs(d.children, tid, [...path, d]); if (f) return f; }
      } return null;
    };
    const crumbs = activeDocumentId ? getCrumbs(documents, activeDocumentId) : null;
    const docMeta = crumbs ? crumbs[crumbs.length - 1] : null;
    const title = docMeta ? docMeta.title || 'Untitled' : 'Untitled';

    // Temporarily set page title so PDF filename matches document
    const prevTitle = document.title;
    document.title = title;

    // Trigger browser print dialog (uses @media print CSS)
    window.print();

    // Restore title
    document.title = prevTitle;
  };

  const starred = activeDocumentId ? isFavorite(activeDocumentId) : false;

  const getBreadcrumbs = (docs: DocumentMeta[], targetId: string, path: DocumentMeta[] = []): DocumentMeta[] | null => {
    for (const doc of docs) {
      if (doc.id === targetId) return [...path, doc];
      if (doc.children) {
        const found = getBreadcrumbs(doc.children, targetId, [...path, doc]);
        if (found) return found;
      }
    }
    return null;
  };

  const breadcrumbs = activeDocumentId ? getBreadcrumbs(documents, activeDocumentId) : [];

  const handleStar = () => {
    if (!activeDocumentId) return;
    setStarAnimating(true);
    toggleFavorite(activeDocumentId);
    setTimeout(() => setStarAnimating(false), 350);
  };

  return (
    <>
      <div className="h-12 flex items-center justify-between px-4 bg-white/95 sticky top-0 z-10"
           style={{ borderBottom: '1px solid #f0f0f0', backdropFilter: 'blur(10px)' }}>

        {/* Left: toggle + breadcrumbs */}
        <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="icon-btn flex-shrink-0 mr-1"
            >
              <Menu size={16} />
            </button>
          )}

          <div className="flex items-center overflow-x-auto flex-nowrap"
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {breadcrumbs?.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && (
                  <ChevronRight size={13} className="text-gray-300 mx-0.5 flex-shrink-0" />
                )}
                <button
                  className="breadcrumb-item flex-shrink-0"
                  onClick={() => useDocumentStore.getState().setActiveDocument(crumb.id)}
                  title={crumb.title}
                >
                  {crumb.icon && <span className="text-sm">{crumb.icon}</span>}
                  <span className="text-[13px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                    {crumb.title.length > 22 ? crumb.title.slice(0, 22) + '…' : crumb.title}
                  </span>
                </button>
              </React.Fragment>
            ))}
            {!breadcrumbs?.length && (
              <span className="text-[13px] text-gray-400 font-medium px-2">Workspace</span>
            )}
          </div>
        </div>

        {/* Font Picker in Topbar */}
        {activeDocumentId && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Type size={13} className="text-gray-400" />
            <select
              value={editorFont}
              onChange={(e) => setEditorFont(e.target.value)}
              title="Change editor font"
              style={{
                fontFamily: FONT_OPTIONS.find(f => f.value === editorFont)?.family,
                fontSize: 12,
                padding: '3px 6px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--color-notion-text-sub)',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: 120,
              }}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setActiveModal('share')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <Share2 size={13} />
            Share
          </button>

          <button
            onClick={handleStar}
            className={`icon-btn ${starAnimating ? 'star-pop' : ''}`}
            title={starred ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Star
              size={17}
              className={`transition-all duration-200 ${starred ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-gray-400'}`}
            />
          </button>

          <button
            onClick={() => setActiveModal('history')}
            className="icon-btn"
            title="Page history"
          >
            <Clock size={17} className="text-gray-400" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className={`icon-btn ${showMoreMenu ? 'bg-gray-100' : ''}`}
              title="More options"
            >
              <MoreHorizontal size={17} className="text-gray-400" />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 flex flex-col font-sans">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 w-full text-left transition"
                  >
                    <Printer size={15} className="text-gray-400" /> Export as PDF
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); setActiveModal('shortcuts'); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 w-full text-left transition"
                  >
                    <Keyboard size={15} className="text-gray-400" /> Keyboard shortcuts
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {activeModal === 'share' && <ShareModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'history' && <HistoryModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'shortcuts' && <ShortcutsModal onClose={() => setActiveModal(null)} />}
    </>
  );
}
