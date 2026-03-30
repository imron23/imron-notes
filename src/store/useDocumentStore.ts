import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentMeta, Document } from '../types';
import { api } from '../api';

interface DocumentStore {
  documents: DocumentMeta[];
  archivedDocuments: DocumentMeta[];
  activeDocumentId: string | null;
  setActiveDocument: (id: string | null) => void;
  
  // API Fetch
  fetchTree: () => Promise<void>;
  fetchArchived: () => Promise<void>;
  fetchContent: (id: string) => Promise<void>;

  // Basic CRUD for tree
  addDocument: (parentId: string | null) => string;
  renameDocument: (id: string, title: string) => void;
  deleteDocument: (id: string) => void; // soft delete
  restoreDocument: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
  updateIcon: (id: string, icon: string) => void;
  updateCover: (id: string, coverUrl: string) => void;
  
  moveDocument: (id: string, newParentId: string | null) => void;
  updateShareStatus: (id: string, isShared: boolean) => void;
  
  // Document contents mapping
  documentContents: Record<string, Document>;
  updateContent: (id: string, content: any) => void;

  // Page history (snapshots per document)
  pageHistory: Record<string, Array<{ timestamp: string; content: any }>>;
  addHistorySnapshot: (id: string, content: any) => void;
}

const updateTreeItem = (
  items: DocumentMeta[], 
  id: string, 
  updateFn: (item: DocumentMeta) => Partial<DocumentMeta>
): DocumentMeta[] => {
  return items.map(item => {
    if (item.id === id) {
      return { ...item, ...updateFn(item) };
    }
    if (item.children) {
      return { ...item, children: updateTreeItem(item.children, id, updateFn) };
    }
    return item;
  });
};

const findAndRemoveTreeItem = (
  items: DocumentMeta[], 
  id: string,
  removedContainer?: { item: DocumentMeta | null }
): DocumentMeta[] => {
  return items.filter(item => {
    if (item.id === id) {
      if (removedContainer) removedContainer.item = item;
      return false;
    }
    if (item.children) {
      item.children = findAndRemoveTreeItem(item.children, id, removedContainer);
    }
    return true;
  });
};

const addTreeItem = (
  items: DocumentMeta[], 
  parentId: string | null, 
  newItem: DocumentMeta
): DocumentMeta[] => {
  if (parentId === null) {
    return [...items, newItem];
  }
  return items.map(item => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children || []), newItem] };
    }
    if (item.children) {
      return { ...item, children: addTreeItem(item.children, parentId, newItem) };
    }
    return item;
  });
};

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Ensure stable offline UX while allowing backend sync
export const useDocumentStore = create<DocumentStore>()(
  persist((set, get) => ({
  documents: [],
  archivedDocuments: [],
  activeDocumentId: null,
  documentContents: {},
  pageHistory: {},
  
  fetchTree: async () => {
    try {
      const tree = await api.get('/documents/tree');
      const local = get().documents;
      
      // Temporary Migration Logic: if DB is empty but we have local notes, push them!
      if ((!tree || tree.length === 0) && local.length > 0 && local[0].id) {
        console.log("Migrating local documents to backend...");
        const traverseAndUpload = async (docs: typeof local) => {
          for (const d of docs) {
            await api.post('/documents/', { id: d.id, title: d.title, parent_id: d.parentId }).catch(() => {});
            if (d.icon) await api.patch(`/documents/${d.id}`, { icon: d.icon }).catch(() => {});
            if (d.coverImage) await api.patch(`/documents/${d.id}`, { cover_image: d.coverImage }).catch(() => {});
            
            const content = get().documentContents[d.id];
            if (content?.content) {
               await api.patch(`/documents/${d.id}`, { content: content.content }).catch(() => {});
            }
            if (d.children && d.children.length > 0) await traverseAndUpload(d.children);
          }
        };
        await traverseAndUpload(local);
        
        const newTree = await api.get('/documents/tree');
        set({ documents: newTree || [] });
      } else {
        set({ documents: tree || [] });
      }
    } catch (e) {
      console.error('Failed to fetch tree API', e);
    }
  },

  fetchArchived: async () => {
    try {
      const arch = await api.get('/documents/archived');
      set({ archivedDocuments: arch || [] });
    } catch (e) {
      console.error('Failed to fetch archived API', e);
    }
  },

  fetchContent: async (id) => {
    try {
      if (!id) return;
      const d = await api.get(`/documents/${id}`);
      if (d) {
        set((state) => ({
          documentContents: { ...state.documentContents, [id]: d }
        }));
      }
    } catch (e) {
      console.error('Failed to fetch content API', e);
    }
  },

  setActiveDocument: (id) => set({ activeDocumentId: id }),
  
  addDocument: (parentId) => {
    const defaultTitle = 'Untitled';
    const newId = crypto.randomUUID();
    const newItem: DocumentMeta = {
      id: newId,
      title: defaultTitle,
      parentId,
    };
    
    const newContent: Document = {
      id: newId,
      title: defaultTitle,
      content: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // OPTIMISTIC UPDATE
    set((state) => ({
      documents: addTreeItem(state.documents, parentId, newItem),
      documentContents: { ...state.documentContents, [newId]: newContent },
      activeDocumentId: newId,
    }));
    
    // BACKEND SYNC
    api.post('/documents/', { id: newId, title: defaultTitle, parent_id: parentId }).catch(console.error);

    return newId;
  },
  
  renameDocument: (id, title) => {
    set((state) => ({
      documents: updateTreeItem(state.documents, id, () => ({ title })),
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], title }
      }
    }));
    // BACKEND SYNC
    api.patch(`/documents/${id}`, { title }).catch(console.error);
  },
  
  updateIcon: (id, icon) => {
    set((state) => ({
      documents: updateTreeItem(state.documents, id, () => ({ icon })),
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], icon }
      }
    }));
    api.patch(`/documents/${id}`, { icon }).catch(console.error);
  },
  
  updateCover: (id, coverUrl) => {
    set((state) => ({
      documents: updateTreeItem(state.documents, id, () => ({ coverImage: coverUrl })),
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], coverImage: coverUrl }
      }
    }));
    api.patch(`/documents/${id}`, { cover_image: coverUrl }).catch(console.error);
  },

  updateShareStatus: (id, isShared) => {
    set((state) => ({ documents: updateTreeItem(state.documents, id, () => ({ isShared })) }));
  },
  
  deleteDocument: (id) => {
    set((state) => {
      const removedContainer = { item: null as DocumentMeta | null };
      const newDocs = findAndRemoveTreeItem(state.documents, id, removedContainer);
      const newActiveId = state.activeDocumentId === id ? null : state.activeDocumentId;
      
      const newArchived = [...state.archivedDocuments];
      if (removedContainer.item) {
         newArchived.push(removedContainer.item);
      }
      return { documents: newDocs, archivedDocuments: newArchived, activeDocumentId: newActiveId };
    });
    api.delete(`/documents/${id}`).catch(console.error);
  },
  
  moveDocument: (id, newParentId) => {
    if (id === newParentId) return;
    set((state) => {
      const removedContainer = { item: null as DocumentMeta | null };
      let newDocs = findAndRemoveTreeItem(state.documents, id, removedContainer);
      
      const itemToMove = removedContainer.item;
      if (!itemToMove) return state;

      const checkCycle = (meta: DocumentMeta, targetId: string): boolean => {
         if (meta.id === targetId) return true;
         if (meta.children) return meta.children.some(c => checkCycle(c, targetId));
         return false;
      };
      if (newParentId && checkCycle(itemToMove, newParentId)) {
         return state;
      }

      itemToMove.parentId = newParentId;
      newDocs = addTreeItem(newDocs, newParentId, itemToMove);
      return { documents: newDocs };
    });
    
    // BACKEND SYNC (null parent_id is sent as explicit null thanks to our api struct allowing it maybe)
    // We send double pointer `parent_id` wrapper or rely on omitted field vs null.
    // In our Go backend, `ParentID **string` distinguishes omitted vs null. 
    // Sending null actually overwrites it to null.
    api.patch(`/documents/${id}`, { parent_id: newParentId }).catch(console.error);
  },

  restoreDocument: (id) => {
    set((state) => {
      const itemToRestore = state.archivedDocuments.find(d => d.id === id);
      if (!itemToRestore) return state;
      
      const newArchived = state.archivedDocuments.filter(d => d.id !== id);
      itemToRestore.parentId = null;
      
      return { 
        documents: [...state.documents, itemToRestore],
        archivedDocuments: newArchived,
        activeDocumentId: id
      };
    });
    api.post(`/documents/${id}/restore`).catch(console.error);
  },

  permanentlyDelete: (id) => {
    set((state) => ({
      archivedDocuments: state.archivedDocuments.filter(d => d.id !== id)
    }));
    api.delete(`/documents/${id}/permanent`).catch(console.error);
  },

  emptyTrash: () => {
    const trash = get().archivedDocuments;
    set({ archivedDocuments: [] });
    // Execute permanent delete for all
    trash.forEach(d => {
      api.delete(`/documents/${d.id}/permanent`).catch(console.error);
    });
  },
  
  updateContent: (id, content) => {
    set((state) => ({
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], content, updatedAt: new Date().toISOString() }
      }
    }));
    
    if (debounceTimers[id]) clearTimeout(debounceTimers[id]);
    debounceTimers[id] = setTimeout(() => {
      api.patch(`/documents/${id}`, { content }).catch(console.error);
    }, 1000);
  },

  addHistorySnapshot: (id, content) => {
    set((state) => {
      const existing = state.pageHistory[id] || [];
      const updated = [{ timestamp: new Date().toISOString(), content }, ...existing].slice(0, 30);
      return { pageHistory: { ...state.pageHistory, [id]: updated } };
    });
  },
}), {
  name: 'notion-documents-storage',
  partialize: (state) => ({
    documents: state.documents,
    archivedDocuments: state.archivedDocuments,
    documentContents: state.documentContents,
    activeDocumentId: state.activeDocumentId,
    pageHistory: state.pageHistory
  })
}));
