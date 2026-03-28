import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, Star, ArrowRight } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';

export default function SearchModal() {
  const { documents, documentContents, setActiveDocument } = useDocumentStore();
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const favoriteIds = useUIStore((s) => s.favoriteIds);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all docs
  const allDocs = useMemo(() => {
    const flat = (docs: any[], path: string[] = []): any[] =>
      docs.flatMap((d) => [
        { ...d, path: [...path, d.title] },
        ...(d.children ? flat(d.children, [...path, d.title]) : []),
      ]);
    return flat(documents);
  }, [documents]);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent + favorites
      const favs = allDocs.filter((d) => favoriteIds.includes(d.id));
      const recents = allDocs.slice(0, 8);
      return [...favs, ...recents.filter((r) => !favoriteIds.includes(r.id))].slice(0, 10);
    }
    const q = query.toLowerCase();
    const results = allDocs.filter((d) => {
      const title = (d.title || '').toLowerCase();
      const contentStr = JSON.stringify((documentContents[d.id] as any)?.content || '').toLowerCase();
      return title.includes(q) || contentStr.includes(q);
    });

    results.sort((a, b) => {
      const aDate = new Date(documentContents[a.id]?.createdAt || 0).getTime();
      const bDate = new Date(documentContents[b.id]?.createdAt || 0).getTime();
      return bDate - aDate;
    });

    return results.slice(0, 20);
  }, [query, allDocs, documentContents, favoriteIds]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = (id: string) => {
    setActiveDocument(id);
    setActiveModal(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) { handleSelect(filtered[selectedIndex].id); }
    if (e.key === 'Escape') setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm"
      onClick={() => setActiveModal(null)}>
      <div className="bg-white w-[560px] rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()} style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages or content..."
            className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-gray-300 font-medium"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <kbd className="hidden sm:block text-[10px] font-mono text-gray-300 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 py-2">
          {!query.trim() && (
            <p className="px-5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
              {favoriteIds.length > 0 ? 'Favorites & Recent' : 'Recent Pages'}
            </p>
          )}
          {query.trim() && (
            <p className="px-5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No pages found</p>
              <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
            </div>
          )}
          {filtered.map((doc, idx) => {
            const isFav = favoriteIds.includes(doc.id);
            return (
              <button
                key={doc.id + idx}
                onClick={() => handleSelect(doc.id)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className="w-full text-left"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 20px', fontSize: 14, fontWeight: 450,
                  background: idx === selectedIndex ? '#f3f4f6' : 'transparent',
                  color: '#374151', transition: 'background 0.08s',
                  cursor: 'pointer', border: 'none',
                }}
              >
                <span className="flex-shrink-0 text-base">{doc.icon || <FileText size={16} className="text-gray-300" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontWeight: idx === selectedIndex ? 550 : 450 }}>{doc.title || 'Untitled'}</p>
                  {doc.path && doc.path.length > 1 && (
                    <p className="text-[11px] text-gray-400 truncate">{doc.path.slice(0, -1).join(' / ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isFav && <Star size={12} className="text-amber-400 fill-amber-400" />}
                  {idx === selectedIndex && <ArrowRight size={14} className="text-gray-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 border-t border-gray-50 flex items-center gap-4 text-[10px] text-gray-300 font-mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
