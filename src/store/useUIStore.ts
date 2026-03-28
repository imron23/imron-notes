import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarCollapsed: boolean; // icon-only mode
  setSidebarCollapsed: (v: boolean) => void;
  activeModal: 'search' | 'settings' | 'trash' | 'share' | 'history' | 'shortcuts' | null;
  setActiveModal: (modal: UIStore['activeModal']) => void;

  // Favorites
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Dark mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Upload limits
  uploadLimitMb: number;
  setUploadLimitMb: (l: number) => void;

  // Editor font
  editorFont: string;
  setEditorFont: (font: string) => void;

  // Shortcuts
  shortcuts: {
    search: string;
    newPage: string;
    newFolder: string;
    toggleSidebar: string;
  };
  setShortcut: (action: keyof UIStore['shortcuts'], key: string) => void;

  // Auto-backup
  autoBackupInterval: 'off' | 'daily' | 'weekly' | 'custom';
  autoBackupHours: number;
  setAutoBackup: (interval: UIStore['autoBackupInterval'], hours?: number) => void;
  lastAutoBackup: number | null;
  setLastAutoBackup: (ts: number) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),

      favoriteIds: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((f) => f !== id)
            : [...s.favoriteIds, id],
        })),
      isFavorite: (id) => get().favoriteIds.includes(id),

      isDarkMode: false,
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),

      uploadLimitMb: 1,
      setUploadLimitMb: (l) => set({ uploadLimitMb: l }),

      editorFont: 'default',
      setEditorFont: (font) => set({ editorFont: font }),

      shortcuts: {
        search: 'k',
        newPage: 'n',
        newFolder: 'N',
        toggleSidebar: '\\',
      },
      setShortcut: (action, key) => set((s) => ({ shortcuts: { ...s.shortcuts, [action]: key } })),

      autoBackupInterval: 'off',
      autoBackupHours: 24,
      setAutoBackup: (interval, hours) => set({ autoBackupInterval: interval, ...(hours !== undefined ? { autoBackupHours: hours } : {}) }),
      lastAutoBackup: null,
      setLastAutoBackup: (ts) => set({ lastAutoBackup: ts }),
    }),
    {
      name: 'notion-ui-storage',
      partialize: (s) => ({
        favoriteIds: s.favoriteIds,
        isDarkMode: s.isDarkMode,
        sidebarCollapsed: s.sidebarCollapsed,
        autoBackupInterval: s.autoBackupInterval,
        autoBackupHours: s.autoBackupHours,
        lastAutoBackup: s.lastAutoBackup,
        shortcuts: s.shortcuts,
      }),
    }
  )
);
