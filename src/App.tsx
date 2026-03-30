import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Topbar from './components/topbar/Topbar';
import Editor from './components/editor/Editor';
import DocumentMeta from './components/editor/DocumentMeta';
import SearchModal from './components/search/SearchModal';
import PublicViewPage from './pages/PublicViewPage';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useDocumentStore } from './store/useDocumentStore';
import { useAutoBackup } from './components/sidebar/SettingsModal';

function DocumentPage() {
  return (
    <div className="flex flex-col flex-1 relative">
      <Topbar />
      <div className="mt-8" id="document-print-wrapper">
        <DocumentMeta />
        <Editor />
      </div>
    </div>
  );
}

// Global keyboard shortcuts
function useKeyboardShortcuts() {
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const activeModal = useUIStore((s) => s.activeModal);
  const addDocument = useDocumentStore((s) => s.addDocument);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      const { shortcuts } = useUIStore.getState();

      if (e.key.toLowerCase() === shortcuts.search.toLowerCase()) {
        e.preventDefault();
        setActiveModal(activeModal === 'search' ? null : 'search');
      } else if (e.key === shortcuts.newPage && !e.shiftKey) {
        e.preventDefault();
        const newId = addDocument(null);
        useDocumentStore.getState().setActiveDocument(newId);
      } else if (e.key === shortcuts.newFolder || (e.key.toLowerCase() === shortcuts.newFolder.toLowerCase() && e.shiftKey)) {
        e.preventDefault();
        const newId = addDocument(null);
        useDocumentStore.getState().renameDocument(newId, 'New Folder');
        useDocumentStore.getState().updateIcon(newId, '📁');
        useDocumentStore.getState().setActiveDocument(newId);
      } else if (e.key === shortcuts.toggleSidebar) {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeModal, setActiveModal, addDocument]);
}

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeModal = useUIStore((s) => s.activeModal);
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  useKeyboardShortcuts();
  useAutoBackup();

  // Apply dark mode class to body
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.style.background = isDarkMode ? '#111827' : '#ffffff';
    document.body.style.color = isDarkMode ? '#e5e7eb' : '#1a1a2e';
  }, [isDarkMode]);

  // Deep sync mechanism (Window focus + Polling)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const onFocus = async () => {
      const store = useDocumentStore.getState();
      await store.fetchTree();
      await store.fetchArchived();
      if (store.activeDocumentId) {
        await store.fetchContent(store.activeDocumentId);
      }
    };
    
    // Initial fetch
    onFocus();
    
    // Hook on window focus and visibility
    window.addEventListener('focus', onFocus);
    const handleVis = () => { if (document.visibilityState === 'visible') onFocus(); };
    document.addEventListener('visibilitychange', handleVis);
    
    // Background polling interval (every 10 seconds)
    const intervalId = setInterval(onFocus, 10000);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', handleVis);
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:docId" element={<PublicViewPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DocumentPage />} />
        </Route>
      </Routes>
      {activeModal === 'search' && <SearchModal />}
    </BrowserRouter>
  );
}

export default App;
