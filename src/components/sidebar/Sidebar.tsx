import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import SidebarItem from './SidebarItem';
import { Settings, Search, PlusCircle, ChevronsLeft, ChevronsRight, Trash2, FolderPlus, LogOut, Star, FileText, Moon, Sun } from 'lucide-react';
import TrashModal from './TrashModal';
import SettingsModal from './SettingsModal';
import { useAuthStore } from '../../store/useAuthStore';

function FavoritesSection({ collapsed }: { collapsed: boolean }) {
  const { favoriteIds } = useUIStore();
  const { documents, setActiveDocument, activeDocumentId } = useDocumentStore();
  const flat = (docs: any[]): any[] => docs.flatMap((d) => [d, ...(d.children ? flat(d.children) : [])]);
  const favDocs = flat(documents).filter((d) => favoriteIds.includes(d.id));
  if (favDocs.length === 0) return null;

  if (collapsed) {
    return (
      <div className="sb-favs-collapsed">
        {favDocs.slice(0, 3).map((doc) => (
          <button key={doc.id} onClick={() => setActiveDocument(doc.id)} title={doc.title || 'Untitled'}
            className={`sb-icon-btn ${activeDocumentId === doc.id ? 'active' : ''}`}>
            <span style={{ fontSize: 16 }}>{doc.icon || '📄'}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="sb-section">
      <p className="sb-section-label">Favorites</p>
      {favDocs.map((doc) => (
        <button key={doc.id} onClick={() => setActiveDocument(doc.id)}
          className={`sb-btn ${activeDocumentId === doc.id ? 'active' : ''}`}>
          <Star size={12} style={{ fill: '#fbbf24', color: '#fbbf24', flexShrink: 0 }} />
          <span style={{ flexShrink: 0 }}>{doc.icon || '📄'}</span>
          <span className="sb-truncate">{doc.title || 'Untitled'}</span>
        </button>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const activeModal = useUIStore((s) => s.activeModal);
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { documents, addDocument } = useDocumentStore();

  const displayName = user?.username || 'Admin';
  const initial = displayName[0]?.toUpperCase() || 'A';

  const handleCreateFolder = () => {
    const newId = addDocument(null);
    useDocumentStore.getState().renameDocument(newId, 'New Folder');
    useDocumentStore.getState().updateIcon(newId, '📁');
    useDocumentStore.getState().setActiveDocument(newId);
  };

  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isSidebarOpen) return null;

  if (isMobile) {
    return (
      <>
        <div className="sidebar-mobile-overlay" onClick={useUIStore.getState().toggleSidebar} />
        <aside className="sb-root sb-mobile">
          <div className="sb-header">
            <div className="sb-profile">
              <div className="sb-avatar">{initial}</div>
              <div className="sb-profile-info">
                <p className="sb-profile-name">{displayName.split('@')[0]}'s Space</p>
                <p className="sb-profile-sub">Mobile workspace</p>
              </div>
            </div>
          </div>
          <div className="sb-divider" />

          <div className="sb-section">
            <button className="sb-btn" onClick={() => { setActiveModal('search'); useUIStore.getState().toggleSidebar(); }}>
              <Search size={14} /><span>Search</span>
            </button>
            <button className="sb-btn" onClick={() => { const id = addDocument(null); useDocumentStore.getState().setActiveDocument(id); useUIStore.getState().toggleSidebar(); }}>
              <PlusCircle size={14} /><span>New Page</span>
            </button>
            <button className="sb-btn" onClick={() => { handleCreateFolder(); useUIStore.getState().toggleSidebar(); }}>
              <FolderPlus size={14} /><span>New Folder</span>
            </button>
          </div>
          <div className="sb-divider" />

          <FavoritesSection collapsed={false} />

          <div className="sb-tree">
            <p className="sb-section-label">Pages</p>
            {documents.map((doc) => <SidebarItem key={doc.id} item={doc} depth={0} />)}
          </div>

          <div className="sb-footer">
            <button className="sb-btn" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button className="sb-btn" onClick={() => { setActiveModal('settings'); useUIStore.getState().toggleSidebar(); }}>
              <Settings size={14} /><span>Settings & Backup</span>
            </button>
            <div className="sb-user-row">
              <div className="sb-avatar-sm">{initial}</div>
              <p className="sb-user-email">{displayName}</p>
              <button onClick={logout} className="sb-logout-btn"><LogOut size={13} /></button>
            </div>
          </div>
          {activeModal === 'trash' && <TrashModal onClose={() => setActiveModal(null)} />}
          {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} />}
        </aside>
      </>
    );
  }

  if (sidebarCollapsed) {
    return (
      <aside className="sb-root sb-collapsed">
        <div className="sb-avatar" onClick={() => setSidebarCollapsed(false)} title="Expand sidebar" style={{ cursor: 'pointer', margin: '8px auto' }}>
          {initial}
        </div>
        <div className="sb-divider-h" />

        {[
          { icon: <Search size={16} />, title: 'Search (⌘K)', onClick: () => setActiveModal('search') },
          { icon: <PlusCircle size={16} />, title: 'New Page (⌘N)', onClick: () => { const id = addDocument(null); useDocumentStore.getState().setActiveDocument(id); } },
          { icon: <FolderPlus size={16} />, title: 'New Folder (⌘⇧N)', onClick: handleCreateFolder },
        ].map((item) => (
          <button key={item.title} onClick={item.onClick} title={item.title} className="sb-icon-btn">
            {item.icon}
          </button>
        ))}

        <div className="sb-divider-h" />
        <FavoritesSection collapsed={true} />
        <div style={{ flex: 1 }} />

        {[
          { icon: isDarkMode ? <Sun size={16} /> : <Moon size={16} />, title: 'Toggle Dark Mode', onClick: toggleDarkMode },
          { icon: <Settings size={16} />, title: 'Settings', onClick: () => setActiveModal('settings') },
          { icon: <Trash2 size={16} />, title: 'Trash', onClick: () => setActiveModal('trash') },
        ].map((item) => (
          <button key={item.title} onClick={item.onClick} title={item.title} className="sb-icon-btn">
            {item.icon}
          </button>
        ))}

        <button onClick={() => setSidebarCollapsed(false)} title="Expand sidebar" className="sb-icon-btn">
          <ChevronsRight size={15} />
        </button>

        {activeModal === 'trash' && <TrashModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} />}
      </aside>
    );
  }

  // Full sidebar
  return (
    <aside className="sb-root">
      <div className="sb-header">
        <div className="sb-profile">
          <div className="sb-avatar">{initial}</div>
          <div className="sb-profile-info">
            <p className="sb-profile-name">{displayName.split('@')[0]}'s Space</p>
            <p className="sb-profile-sub">Personal workspace</p>
          </div>
        </div>
        <button onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar" className="sb-collapse-btn">
          <ChevronsLeft size={15} />
        </button>
      </div>

      <div className="sb-divider" />

      <div className="sb-section">
        <button className="sb-btn" onClick={() => setActiveModal('search')}>
          <Search size={14} /><span>Search</span>
          <span className="sb-shortcut">⌘K</span>
        </button>
        <button className="sb-btn" onClick={() => { const id = addDocument(null); useDocumentStore.getState().setActiveDocument(id); }}>
          <PlusCircle size={14} /><span>New Page</span>
          <span className="sb-shortcut">⌘N</span>
        </button>
        <button className="sb-btn" onClick={handleCreateFolder}>
          <FolderPlus size={14} /><span>New Folder</span>
          <span className="sb-shortcut">⌘⇧N</span>
        </button>
      </div>

      <div className="sb-divider" />

      <FavoritesSection collapsed={false} />

      <div className="sb-tree"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData('documentId');
          if (id) useDocumentStore.getState().moveDocument(id, null);
        }}>
        <p className="sb-section-label">Pages</p>
        {documents.length === 0 ? (
          <div className="sb-empty">
            <FileText size={24} />
            <p>No pages yet</p>
          </div>
        ) : documents.map((doc) => <SidebarItem key={doc.id} item={doc} depth={0} />)}
      </div>

      <div className="sb-footer">
        <button className="sb-btn" onClick={toggleDarkMode}>
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="sb-btn" onClick={() => setActiveModal('settings')}>
          <Settings size={14} /><span>Settings & Backup</span>
        </button>
        <button className="sb-btn" onClick={() => setActiveModal('trash')}>
          <Trash2 size={14} /><span>Trash</span>
        </button>
        <div className="sb-user-row">
          <div className="sb-avatar-sm">{initial}</div>
          <p className="sb-user-email">{displayName}</p>
          <button onClick={logout} title="Log out" className="sb-logout-btn">
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {activeModal === 'trash' && <TrashModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} />}
    </aside>
  );
}
