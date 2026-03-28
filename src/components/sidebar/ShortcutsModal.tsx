import React, { useState } from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const { shortcuts, setShortcut } = useUIStore();
  const [recordingAction, setRecordingAction] = useState<keyof typeof shortcuts | null>(null);

  const shortcutMapping = [
    { key: 'search', label: 'Search Modal' },
    { key: 'newPage', label: 'New Page' },
    { key: 'newFolder', label: 'New Folder' },
    { key: 'toggleSidebar', label: 'Toggle Sidebar' },
  ] as const;

  const handleKeyDown = (e: React.KeyboardEvent, action: keyof typeof shortcuts) => {
    e.preventDefault();
    if (e.key === 'Escape') {
      setRecordingAction(null);
      return;
    }
    // Only capture printable characters or specific functional keys that work well
    if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') return;
    setShortcut(action, e.key);
    setRecordingAction(null);
  };

  const getShortcutDisplay = (char: string) => {
    // For formatting like ⌘K
    const isUpper = char === char.toUpperCase() && char.length === 1 && char !== char.toLowerCase();
    const cmd = <Command size={12} className="inline mr-0.5" />;
    return (
      <>
        {cmd}
        {isUpper ? '⇧' : ''}
        {char.toUpperCase()}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-[480px] rounded-2xl shadow-2xl p-6 border border-gray-100" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Keyboard size={18} className="text-gray-400" /> Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-50"><X size={18} /></button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-500 mb-6 font-medium">Click on a shortcut to record a new key. All shortcuts are triggered alongside ⌘ (or Control on Windows).</p>

        <div className="space-y-2">
          {shortcutMapping.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition bg-gray-50/50">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              {recordingAction === item.key ? (
                <div
                  autoFocus
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, item.key)}
                  onBlur={() => setRecordingAction(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg outline-none ring-2 ring-indigo-100 flex items-center shadow-sm w-[100px] justify-center"
                >
                  Press key...
                </div>
              ) : (
                <button
                  onClick={() => setRecordingAction(item.key)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition shadow-sm w-[100px] flex items-center justify-center"
                >
                  {getShortcutDisplay(shortcuts[item.key])}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition shadow-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
