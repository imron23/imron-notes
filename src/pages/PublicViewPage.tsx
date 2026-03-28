import { useParams, Link } from 'react-router-dom';
import { useDocumentStore } from '../store/useDocumentStore';
import { ChevronRight, FileText, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function PublicViewPage() {
  const { docId } = useParams<{ docId: string }>();
  const { documents, documentContents } = useDocumentStore();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  
  const doc = docId ? documentContents[docId] : null;

  // Find breadcrumb path and meta
  const findPath = (docs: any[], targetId: string, path: any[] = []): any[] | null => {
    for (const d of docs) {
      if (d.id === targetId) return [...path, d];
      if (d.children) {
        const found = findPath(d.children, targetId, [...path, d]);
        if (found) return found;
      }
    }
    return null;
  };
  const breadcrumbs = docId ? findPath(documents, docId) : null;
  const docMeta = breadcrumbs ? breadcrumbs[breadcrumbs.length - 1] : null;

  if (!doc || !docMeta || !docMeta.isShared) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', background: isDarkMode ? '#111827' : '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <FileText size={48} style={{ color: isDarkMode ? '#374151' : '#d1d5db', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#374151' }}>Page not found</h2>
          <p style={{ fontSize: 14, color: isDarkMode ? '#9ca3af' : '#9ca3af', marginTop: 8 }}>This page may be private or doesn't exist.</p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
            <ArrowLeft size={14} /> Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  // Render blocks as read-only HTML
  const renderBlocks = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return <p style={{ color: '#9ca3af', fontSize: 14 }}>No content</p>;
    return blocks.map((block: any, i: number) => {
      const text = block.content?.map((c: any) => c.text || '').join('') || '';
      const style: React.CSSProperties = { margin: '4px 0', lineHeight: 1.7, color: '#374151', fontSize: 15 };
      switch (block.type) {
        case 'heading':
          const level = block.props?.level || 1;
          const hStyles: Record<number, React.CSSProperties> = {
            1: { fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', color: isDarkMode ? '#f3f4f6' : '#111827', marginTop: 32, marginBottom: 8 },
            2: { fontSize: 28, fontWeight: 650, letterSpacing: '-0.015em', color: isDarkMode ? '#e5e7eb' : '#1f2937', marginTop: 24, marginBottom: 6 },
            3: { fontSize: 22, fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#374151', marginTop: 16, marginBottom: 4 },
          };
          return <div key={i} style={hStyles[level] || hStyles[1]}>{text}</div>;
        case 'bulletListItem':
          return <li key={i} style={{ ...style, marginLeft: 20, listStyle: 'disc' }}>{text}</li>;
        case 'numberedListItem':
          return <li key={i} style={{ ...style, marginLeft: 20, listStyle: 'decimal' }}>{text}</li>;
        case 'checkListItem':
          return (
            <div key={i} style={{ ...style, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={block.props?.checked} readOnly style={{ accentColor: '#6366f1' }} />
              <span style={block.props?.checked ? { textDecoration: 'line-through', color: '#9ca3af' } : {}}>{text}</span>
            </div>
          );
        case 'image':
          return <img key={i} src={block.props?.url} alt="" style={{ maxWidth: '100%', borderRadius: 8, margin: '12px 0' }} />;
        default:
          if (!text.trim()) return <div key={i} style={{ height: 8 }} />;
          return <p key={i} style={style}>{text}</p>;
      }
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: isDarkMode ? '#111827' : '#fafafa', color: isDarkMode ? '#e5e7eb' : '#374151', fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: isDarkMode ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
          {breadcrumbs?.map((crumb, idx) => (
            <div key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {idx > 0 && <ChevronRight size={13} style={{ color: '#d1d5db' }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', padding: '3px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                {crumb.icon && <span style={{ marginRight: 4 }}>{crumb.icon}</span>}
                {crumb.title}
              </span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Read-only view</span>
      </div>

      {/* Cover */}
      {doc.coverImage && (
        <div style={{ width: '100%', height: 240, overflow: 'hidden', position: 'relative' }}>
          <img src={doc.coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.15))' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 120px' }}>
        {doc.icon && <div style={{ fontSize: 64, marginBottom: 12 }}>{doc.icon}</div>}
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', color: isDarkMode ? '#f3f4f6' : '#111827', marginBottom: 24, lineHeight: 1.15 }}>
          {doc.title || 'Untitled'}
        </h1>
        <div>{renderBlocks((doc as any).content)}</div>
      </div>
    </div>
  );
}
