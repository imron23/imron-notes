import { useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { Link2, Copy, Globe, Lock, Check, ExternalLink } from 'lucide-react';

interface ShareModalProps { onClose: () => void; }

export default function ShareModal({ onClose }: ShareModalProps) {
  const { activeDocumentId, documentContents, documents, updateShareStatus } = useDocumentStore();
  const doc = activeDocumentId ? documentContents[activeDocumentId] : null;
  
  // Find doc meta recursively
  const findMeta = (docs: any[], targetId: string): any => {
    for (const d of docs) {
      if (d.id === targetId) return d;
      if (d.children?.length) {
        const found = findMeta(d.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  const docMeta = activeDocumentId ? findMeta(documents, activeDocumentId) : null;
  const isPublic = !!docMeta?.isShared;

  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/p/${activeDocumentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-[440px] rounded-2xl shadow-2xl overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-[15px] text-gray-800">Share "{doc?.title || 'Untitled'}"</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Publish this page for anyone with the link</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="flex items-center gap-3">
              {isPublic ? <Globe size={18} className="text-indigo-500" /> : <Lock size={18} className="text-gray-300" />}
              <div>
                <p className="text-sm font-medium text-gray-700">{isPublic ? 'Published to web' : 'Private'}</p>
                <p className="text-[11px] text-gray-400">{isPublic ? 'Anyone with link can view (read-only)' : 'Only you can access'}</p>
              </div>
            </div>
            <button onClick={() => activeDocumentId && updateShareStatus(activeDocumentId, !isPublic)}
              style={{
                position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center',
                borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s', border: 'none',
                background: isPublic ? '#6366f1' : '#e5e7eb',
              }}>
              <span style={{
                display: 'inline-block', height: 18, width: 18, borderRadius: 999, background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s',
                transform: isPublic ? 'translateX(18px)' : 'translateX(2px)',
              }} />
            </button>
          </div>

          {/* Link */}
          <div className={`transition-opacity duration-200 ${isPublic ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Page Link</p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Link2 size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-[12px] text-gray-500 truncate flex-1">{shareUrl}</span>
              <button onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition flex-shrink-0 shadow-sm">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* View link */}
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition">
              <ExternalLink size={12} /> View published page
            </a>
          </div>
        </div>

        <div className="px-5 pb-4 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition shadow-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
