import React, { useRef, useState, useEffect } from 'react';
import { Settings, Download, Upload, X, Loader2, Shield, Clock, Moon, Sun, AlertTriangle, Check, Globe, Lock, Share2 } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import type { DocumentMeta } from '../../types';
import { useUIStore } from '../../store/useUIStore';

interface SettingsModalProps { onClose: () => void; }

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-[380px] rounded-xl shadow-2xl p-6 border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <p className="text-sm text-gray-700 font-medium leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition shadow-sm">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// Recursively strip heavy data from BlockNote blocks
function stripBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map(block => {
    const clean: any = { ...block };

    // Strip image blocks — remove base64 src, keep alt text
    if (clean.type === 'image' && clean.props?.url) {
      if (clean.props.url.startsWith('data:')) {
        clean.props = { ...clean.props, url: '[image-removed-for-backup]' };
      }
    }

    // Monaco/code blocks: keep only language + code text  
    if (clean.type === 'monacoCode' && clean.props) {
      clean.props = {
        language: clean.props.language || 'plaintext',
        code: clean.props.code || '',
      };
    }

    // Recursively clean children
    if (clean.children) {
      clean.children = stripBlocks(clean.children);
    }
    return clean;
  });
}

// Strip coverImage from document tree
function stripDocTree(docs: any[]): any[] {
  return docs.map(d => {
    const { coverImage, ...rest } = d;
    return {
      ...rest,
      children: d.children ? stripDocTree(d.children) : undefined,
    };
  });
}

function doAutoBackup(): void {
  const state = useDocumentStore.getState();
  
  // Clean documentContents: strip coverImage & heavy block data
  const cleanContents: Record<string, any> = {};
  for (const [id, doc] of Object.entries(state.documentContents)) {
    const { coverImage, ...rest } = doc as any;
    cleanContents[id] = {
      ...rest,
      content: Array.isArray(rest.content) ? stripBlocks(rest.content) : rest.content,
    };
  }
  
  const backupData = {
    documents: stripDocTree(state.documents),
    archivedDocuments: stripDocTree(state.archivedDocuments),
    documentContents: cleanContents,
    version: 3,
    exportedAt: new Date().toISOString(),
  };

  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  const filename = `notion_backup_${ts}.json`;

  try {
    const json = JSON.stringify(backupData);
    console.log(`[Backup] Size: ${(json.length / 1024).toFixed(1)} KB`);

    const blob = new Blob([json], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    // Method 1: Direct anchor click (most reliable)
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    // Append to body outside any modal portal
    document.body.appendChild(a);
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 5000);
    });

    useUIStore.getState().setLastAutoBackup(Date.now());
  } catch (err) {
    console.error('Export failed:', err);
    alert('Export gagal: ' + (err as Error).message);
  }
}


// Auto-backup hook
export function useAutoBackup() {
  const { autoBackupInterval, autoBackupHours, lastAutoBackup } = useUIStore();
  useEffect(() => {
    if (autoBackupInterval === 'off') return;
    let ms: number;
    switch (autoBackupInterval) {
      case 'daily': ms = 24 * 60 * 60 * 1000; break;
      case 'weekly': ms = 7 * 24 * 60 * 60 * 1000; break;
      case 'custom': ms = autoBackupHours * 60 * 60 * 1000; break;
      default: return;
    }
    const check = () => {
      const now = Date.now();
      if (!lastAutoBackup || (now - lastAutoBackup) >= ms) {
        doAutoBackup();
      }
    };
    check();
    const id = setInterval(check, 60 * 1000); // check every minute
    return () => clearInterval(id);
  }, [autoBackupInterval, autoBackupHours, lastAutoBackup]);
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'shared'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, updateShareStatus } = useDocumentStore();
  const { isDarkMode, toggleDarkMode, autoBackupInterval, autoBackupHours, setAutoBackup, lastAutoBackup, uploadLimitMb, setUploadLimitMb, editorFont, setEditorFont } = useUIStore();

  const FONT_OPTIONS = [
    { value: 'default', label: 'Default (System)', family: 'ui-sans-serif, system-ui, sans-serif' },
    { value: 'Inter', label: 'Inter', family: 'Inter, sans-serif' },
    { value: 'Roboto', label: 'Roboto', family: 'Roboto, sans-serif' },
    { value: 'Open Sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
    { value: 'Lato', label: 'Lato', family: 'Lato, sans-serif' },
    { value: 'Montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif' },
    { value: 'Noto Sans', label: 'Noto Sans', family: '"Noto Sans", sans-serif' },
    { value: 'Ubuntu', label: 'Ubuntu', family: 'Ubuntu, sans-serif' },
    { value: 'Merriweather', label: 'Merriweather (Serif)', family: 'Merriweather, serif' },
    { value: 'Playfair Display', label: 'Playfair Display (Serif)', family: '"Playfair Display", serif' },
    { value: 'Source Code Pro', label: 'Source Code Pro (Mono)', family: '"Source Code Pro", monospace' },
  ];

  const getSharedDocs = (docs: DocumentMeta[]): DocumentMeta[] => {
    let shared: DocumentMeta[] = [];
    for (const d of docs) {
      if (d.isShared) shared.push(d);
      if (d.children?.length) shared = [...shared, ...getSharedDocs(d.children)];
    }
    return shared;
  };
  const sharedDocs = getSharedDocs(documents);

  const handleExport = () => {
    try {
      setIsLoading(true); setMessage(null);
      doAutoBackup();
      setTimeout(() => {
        setMessage({ type: 'success', text: '✅ Backup berhasil diunduh!' });
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Export gagal' });
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show confirmation before restoring
    setConfirmAction(() => async () => {
      try {
        setIsLoading(true); setMessage(null);
        const fileData = await file.text();
        const parsed = JSON.parse(fileData);
        if (!parsed.documents || !parsed.documentContents) throw new Error('Invalid backup file.');
        useDocumentStore.setState({
          documents: parsed.documents,
          archivedDocuments: parsed.archivedDocuments || [],
          documentContents: parsed.documentContents,
          pageHistory: parsed.pageHistory || {},
          activeDocumentId: parsed.documents[0]?.id || null,
        });
        setMessage({ type: 'success', text: '✅ Backup restored! All data rehydrated safely.' });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Invalid backup file' });
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setConfirmAction(null);
      }
    });
  };

  const toggleStyle: React.CSSProperties = { position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center', borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s', border: 'none' };
  const thumbStyle = (on: boolean): React.CSSProperties => ({ display: 'inline-block', height: 18, width: 18, borderRadius: 999, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: on ? 'translateX(18px)' : 'translateX(2px)' });

  const formatTime = (ts: number | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-[560px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 sticky top-0 bg-white/95 backdrop-blur z-10" style={{ borderRadius: '16px 16px 0 0' }}>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Settings size={18} className="text-gray-400" /> Settings
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-50"><X size={18} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-2">
          <button onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            General Settings
          </button>
          <button onClick={() => setActiveTab('shared')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'shared' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Share2 size={14} /> Shared Pages
            {sharedDocs.length > 0 && <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] text-gray-600 font-bold">{sharedDocs.length}</span>}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'general' ? (
            <>
              {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-700">Appearance</p>
                <p className="text-[11px] text-gray-400">{isDarkMode ? 'Dark mode enabled' : 'Light mode'}</p>
              </div>
            </div>
            <button onClick={toggleDarkMode} style={{ ...toggleStyle, background: isDarkMode ? '#6366f1' : '#e5e7eb' }}>
              <span style={thumbStyle(isDarkMode)} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 mb-6">
            <div className="flex items-center gap-3">
              <Upload size={18} className="text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Upload Limit</p>
                <p className="text-[11px] text-gray-400">Max file size for cover/image</p>
              </div>
            </div>
            <select
              value={uploadLimitMb}
              onChange={(e) => setUploadLimitMb(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none"
            >
              <option value={1}>1 MB</option>
              <option value={2}>2 MB</option>
              <option value={5}>5 MB</option>
              <option value={10}>10 MB</option>
            </select>
          </div>

          {/* Font Picker */}
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 mb-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>A</span>
              <div>
                <p className="text-sm font-medium text-gray-700">Editor Font</p>
                <p className="text-[11px] text-gray-400">Font for document content</p>
              </div>
            </div>
            <select
              value={editorFont}
              onChange={(e) => setEditorFont(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none"
              style={{ maxWidth: '160px', fontFamily: FONT_OPTIONS.find(f => f.value === editorFont)?.family }}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>{f.label}</option>
              ))}
            </select>
          </div>


          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={13} /> Data Management
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Export or restore all workspace data. Restoring will <strong>replace all current data</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={handleExport} disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-50">
                <Download size={15} /> Export (.json)
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition shadow-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Restore Backup
              </button>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            </div>
          </div>

          {/* Auto-backup */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={13} /> Auto-Backup
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['off', 'daily', 'weekly', 'custom'] as const).map((opt) => (
                <button key={opt} onClick={() => setAutoBackup(opt)}
                  style={{
                    padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 550, border: 'none', cursor: 'pointer',
                    background: autoBackupInterval === opt ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f3f4f6',
                    color: autoBackupInterval === opt ? 'white' : '#6b7280',
                    transition: 'all 0.15s', textTransform: 'capitalize',
                  }}>{opt}</button>
              ))}
            </div>
            {autoBackupInterval === 'custom' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Every</span>
                <input type="number" min={1} max={168} value={autoBackupHours}
                  onChange={(e) => setAutoBackup('custom', parseInt(e.target.value) || 24)}
                  className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                <span className="text-xs text-gray-500">hours</span>
              </div>
            )}
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Check size={11} /> Last backup: {formatTime(lastAutoBackup)}
              {autoBackupInterval !== 'off' && <span className="ml-1">(auto-downloading on schedule)</span>}
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </>
      ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Globe size={13} /> Active Shared Links
              </h3>
              {sharedDocs.length === 0 ? (
                <div className="text-center py-8">
                  <Lock size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No shared pages</p>
                  <p className="text-xs text-gray-400 mt-1">Pages published to the web will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {sharedDocs.map(doc => (
                    <div key={doc.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/50 transition">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                          {doc.icon && <span>{doc.icon}</span>}
                          {doc.title || 'Untitled'}
                        </span>
                        <a href={`/p/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:underline truncate mt-0.5">
                          {window.location.origin}/p/{doc.id}
                        </a>
                      </div>
                      <button onClick={() => updateShareStatus(doc.id, false)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-red-500 rounded-lg shadow-sm hover:bg-red-50 hover:border-red-200 transition flex-shrink-0">
                        Revoke Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          message="Restoring a backup will replace ALL current workspace data. This cannot be undone. Continue?"
          onConfirm={confirmAction}
          onCancel={() => { setConfirmAction(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        />
      )}
    </div>
  );
}
