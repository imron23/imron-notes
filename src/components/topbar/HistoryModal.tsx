import { useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { History, RotateCcw, X } from 'lucide-react';

interface HistoryModalProps {
  onClose: () => void;
}

const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function HistoryModal({ onClose }: HistoryModalProps) {
  const { activeDocumentId, pageHistory, documentContents, updateContent } = useDocumentStore();
  const doc = activeDocumentId ? documentContents[activeDocumentId] : null;
  const snapshots = activeDocumentId ? (pageHistory[activeDocumentId] || []) : [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = (idx: number) => {
    if (!activeDocumentId) return;
    const snap = snapshots[idx];
    setRestoring(true);
    // Save current as latest before restoring
    useDocumentStore.getState().addHistorySnapshot(activeDocumentId, documentContents[activeDocumentId]?.content);
    updateContent(activeDocumentId, snap.content);
    setTimeout(() => {
      setRestoring(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-[560px] max-h-[80vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-500" />
            <h2 className="font-semibold text-[15px]">Page history</h2>
            <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
              {doc?.title || 'Untitled'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400">
              <History size={40} strokeWidth={1.5} className="mb-3 text-gray-300" />
              <p className="text-sm">No history yet</p>
              <p className="text-[11px] mt-1 text-gray-300">Edits are auto-saved every 30 seconds</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {snapshots.map((snap, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedIdx(isSelected ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {idx === 0 ? 'Latest Version' : `Version ${snapshots.length - idx}`}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(snap.timestamp).toLocaleString()} · {formatRelativeTime(snap.timestamp)}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(idx); }}
                        disabled={restoring}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-medium rounded-lg transition shadow-sm"
                      >
                        <RotateCcw size={12} className={restoring ? 'animate-spin' : ''} />
                        {restoring ? 'Restoring…' : 'Restore this version'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
