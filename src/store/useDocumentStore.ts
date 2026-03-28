import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentMeta, Document } from '../types';

interface DocumentStore {
  documents: DocumentMeta[];
  archivedDocuments: DocumentMeta[];
  activeDocumentId: string | null;
  setActiveDocument: (id: string | null) => void;
  
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

// ... tauhidContent ...
const tauhidContent = [
  {
    id: "h2-1",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "📋 Detail Kajian Hari Senin: Tauhid (Mengenal Allah)", styles: {} }]
  },
  {
    id: "b1-1",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Tema Utama: ", styles: { bold: true } },
      { type: "text", text: "Allah Sang Maha Pencipta dan Pemberi Rezeki.", styles: {} }
    ]
  },
  {
    id: "b1-2",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Durasi: ", styles: { bold: true } },
      { type: "text", text: "40 - 60 Menit (Sebelum Maghrib).", styles: {} }
    ]
  },
  {
    id: "b1-3",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Target Capaian: ", styles: { bold: true } },
      { type: "text", text: "Anak mampu menjawab siapa Tuhannya dan mengenali Allah melalui ciptaan-Nya yang terlihat.", styles: {} }
    ]
  },
  {
    id: "div-1",
    type: "paragraph",
    content: []
  },
  {
    id: "h2-2",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "🕒 Struktur Kegiatan", styles: {} }]
  },
  {
    id: "h3-1",
    type: "heading",
    props: { level: 3 },
    content: [{ type: "text", text: "1. Pembukaan (5 Menit)", styles: {} }]
  },
  {
    id: "b2-1",
    type: "bulletListItem",
    content: [{ type: "text", text: "Mulai dengan salam yang hangat dan pelukan.", styles: {} }]
  },
  {
    id: "b2-2",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Pancingan: ", styles: { bold: true } },
      { type: "text", text: "Tanyakan hal-hal menyenangkan yang mereka alami hari ini. \"Tadi siang lihat matahari tidak? Warnanya apa?\"", styles: {} }
    ]
  },
  {
    id: "b2-3",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Sampaikan tujuan: ", styles: { bold: true } },
      { type: "text", text: "\"Hari ini kita mau jadi 'detektif' untuk mencari tahu siapa yang membuat dunia ini.\"", styles: {} }
    ]
  },
  {
    id: "h3-2",
    type: "heading",
    props: { level: 3 },
    content: [{ type: "text", text: "2. Materi Inti: Metode Tanya Jawab (15 Menit)", styles: {} }]
  },
  {
    id: "p-2",
    type: "paragraph",
    content: [
      { type: "text", text: "Gunakan pola dari dokumen ", styles: {} },
      { type: "text", text: "Yuk Belajar Tauhid", styles: { italic: true } },
      { type: "text", text: " yang disederhanakan:", styles: {} }
    ]
  },
  {
    id: "b3-1",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Tanya: ", styles: { bold: true } },
      { type: "text", text: "\"Siapa Tuhanmu?\"", styles: {} }
    ],
    children: [
      {
        id: "b3-1-nested",
        type: "bulletListItem",
        content: [
          { type: "text", text: "Jawab: ", styles: { italic: true } },
          { type: "text", text: "\"Tuhanku adalah Allah.\"", styles: {} }
        ]
      }
    ]
  },
  {
    id: "b3-2",
    type: "bulletListItem",
    content: [
      { type: "text", text: "Tanya: ", styles: { bold: true } },
      { type: "text", text: "\"Bagaimana cara kita mengenal Allah, padahal kita tidak bisa melihat-Nya sekarang?\"", styles: {} }
    ],
    children: [
      {
        id: "b3-2-nested",
        type: "bulletListItem",
        content: [
          { type: "text", text: "Penjelasan: ", styles: { italic: true } },
          { type: "text", text: "Jelaskan bahwa kita mengenal Allah melalui ", styles: {} },
          { type: "text", text: "Ayat-Nya", styles: { bold: true } },
          { type: "text", text: " (Tanda-tanda) dan Makhluk-Nya.", styles: {} }
        ]
      }
    ]
  }
];

const DUMMY_DOCUMENTS: DocumentMeta[] = [
  {
    id: '1',
    title: 'Senin - Tauhid Mengenal Allah',
    icon: '',
    parentId: null,
    children: []
  },
  {
    id: '2',
    title: 'Getting Started',
    icon: '🚀',
    parentId: null,
    children: []
  }
];

const DUMMY_CONTENTS: Record<string, Document> = {
  '1': {
    id: '1',
    title: 'Senin - Tauhid Mengenal Allah',
    icon: '',
    content: tauhidContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  '2': {
    id: '2',
    title: 'Getting Started',
    icon: '🚀',
    content: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
};

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

export const useDocumentStore = create<DocumentStore>()(
  persist((set) => ({
  documents: DUMMY_DOCUMENTS,
  archivedDocuments: [],
  activeDocumentId: '1',
  documentContents: DUMMY_CONTENTS,
  pageHistory: {},
  
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  
  addDocument: (parentId) => {
    const defaultTitle = 'Untitled';
    const newId = Date.now().toString();
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
    
    set((state) => ({
      documents: addTreeItem(state.documents, parentId, newItem),
      documentContents: { ...state.documentContents, [newId]: newContent },
      activeDocumentId: newId,
    }));
    
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
  },
  
  updateIcon: (id, icon) => {
    set((state) => ({
      documents: updateTreeItem(state.documents, id, () => ({ icon })),
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], icon }
      }
    }));
  },
  
  updateCover: (id, coverUrl) => {
    set((state) => ({
      documents: updateTreeItem(state.documents, id, () => ({ coverImage: coverUrl })),
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], coverImage: coverUrl }
      }
    }));
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
  },
  
  moveDocument: (id, newParentId) => {
    if (id === newParentId) return;
    set((state) => {
      const removedContainer = { item: null as DocumentMeta | null };
      let newDocs = findAndRemoveTreeItem(state.documents, id, removedContainer);
      
      const itemToMove = removedContainer.item;
      if (!itemToMove) return state; // Document not found

      // Prevent cyclic moves (moving a folder inside its own subfolder)
      const checkCycle = (meta: DocumentMeta, targetId: string): boolean => {
         if (meta.id === targetId) return true;
         if (meta.children) return meta.children.some(c => checkCycle(c, targetId));
         return false;
      };
      if (newParentId && checkCycle(itemToMove, newParentId)) {
         return state; // Reject move
      }

      itemToMove.parentId = newParentId;
      newDocs = addTreeItem(newDocs, newParentId, itemToMove);
      return { documents: newDocs };
    });
  },

  restoreDocument: (id) => {
    set((state) => {
      const itemToRestore = state.archivedDocuments.find(d => d.id === id);
      if (!itemToRestore) return state;
      
      const newArchived = state.archivedDocuments.filter(d => d.id !== id);
      
      // We push it to root level when restoring to avoid missing parent logic complexities
      itemToRestore.parentId = null;
      
      return { 
        documents: [...state.documents, itemToRestore],
        archivedDocuments: newArchived,
        activeDocumentId: id
      };
    });
  },

  permanentlyDelete: (id) => {
    set((state) => ({
      archivedDocuments: state.archivedDocuments.filter(d => d.id !== id)
    }));
  },

  emptyTrash: () => {
    set({ archivedDocuments: [] });
  },
  
  updateContent: (id, content) => {
    set((state) => ({
      documentContents: {
        ...state.documentContents,
        [id]: { ...state.documentContents[id], content, updatedAt: new Date().toISOString() }
      }
    }));
  },

  addHistorySnapshot: (id, content) => {
    set((state) => {
      const existing = state.pageHistory[id] || [];
      // Keep up to 30 snapshots per doc
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
