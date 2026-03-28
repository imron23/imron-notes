import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';

export default function AppLayout() {
  return (
    <div className="min-h-screen w-full flex items-start" style={{ background: 'var(--color-notion-bg)' }}>
      <div className="sticky top-0 h-screen flex-shrink-0 z-40">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0 relative" style={{ background: 'var(--color-notion-bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
