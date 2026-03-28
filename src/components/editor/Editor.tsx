import { BlockNoteView } from "@blocknote/mantine";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import "@blocknote/mantine/style.css";
import { useRef, useEffect, useState } from "react";
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';
import { PageLinkBlock } from "./blocks/PageLinkBlock";
import { MonacoBlock } from "./blocks/MonacoBlock";
import { FileText, Code2 } from "lucide-react";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLinkBlock(),
    monacoCode: MonacoBlock(),
  },
});

const insertPage = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Subpage",
  onItemClick: () => {
    const store = useDocumentStore.getState();
    const activeDocId = store.activeDocumentId;
    if (!activeDocId) return;

    const newPageId = store.addDocument(activeDocId);
    
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "pageLink",
      props: { pageId: newPageId, pageTitle: "Untitled" }
    } as any);
    
    // Explicitly update store so the block is not lost on unmount
    store.updateContent(activeDocId, editor.document);
    
    // Small timeout ensures everything settles visually
    setTimeout(() => {
        store.setActiveDocument(newPageId);
    }, 0);
  },
  aliases: ["page", "subpage", "link"],
  group: "Basic",
  icon: <FileText size={18} />,
  subtext: "Embed a sub-page inside this page",
});

const insertMonacoCode = (editor: typeof schema.BlockNoteEditor) => ({
  title: "VS Code Block",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "monacoCode",
      props: { code: "", language: "javascript" }
    } as any);
  },
  aliases: ["code", "snippet", "script", "vs", "monaco"],
  group: "Advanced",
  icon: <Code2 size={18} />,
  subtext: "Insert advanced code block with syntax coloring",
});

// Notion styling overrides applied in index.css

export default function Editor() {
  const { activeDocumentId, fetchContent } = useDocumentStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeDocumentId) {
      // Always show a loading state when switching documents to ensure we grab the latest remote version
      setIsLoading(true);
      fetchContent(activeDocumentId).finally(() => setIsLoading(false));
    }
  }, [activeDocumentId, fetchContent]);

  if (!activeDocumentId) {
    return (
      <div className="flex-1 flex items-center justify-center text-notion-text-sub">
        <p>No document selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-notion-text-sub animate-pulse">
        <p>Syncing...</p>
      </div>
    );
  }

  return <EditorInstance key={activeDocumentId} activeDocumentId={activeDocumentId} />;
}

function EditorInstance({ activeDocumentId }: { activeDocumentId: string }) {
  const { documentContents, updateContent } = useDocumentStore();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const editorFont = useUIStore((s) => s.editorFont);

  const FONT_FAMILIES: Record<string, string> = {
    'default': 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    'Inter': 'Inter, sans-serif',
    'Roboto': 'Roboto, sans-serif',
    'Open Sans': '"Open Sans", sans-serif',
    'Lato': 'Lato, sans-serif',
    'Montserrat': 'Montserrat, sans-serif',
    'Noto Sans': '"Noto Sans", sans-serif',
    'Ubuntu': 'Ubuntu, sans-serif',
    'Merriweather': 'Merriweather, serif',
    'Playfair Display': '"Playfair Display", serif',
    'Source Code Pro': '"Source Code Pro", monospace',
  };
  const fontFamily = FONT_FAMILIES[editorFont] || FONT_FAMILIES['default'];

  const doc = documentContents[activeDocumentId];

  // Effect to reset blocknote correctly when document changes 
  const currentEditor = useCreateBlockNote({
    schema,
    initialContent: doc?.content ? (doc.content as any) : undefined,
    uploadFile: async (file: File) => {
      const limitMb = useUIStore.getState().uploadLimitMb;
      const limitBytes = limitMb * 1024 * 1024;
      if (file.size > limitBytes) {
        alert(`File size exceeds the limit of ${limitMb}MB.`);
        return Promise.reject(`File max limit exceeded`);
      }

      // Create a Data URL (base64 inline image) to ensure offline persistence
      // and allow backups to carry embedded image data perfectly across servers
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  });

  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update store on content change
  const handleChange = () => {
    if (!currentEditor) return;
    updateContent(activeDocumentId, currentEditor.document);

    // Debounced history snapshot: save a version 30s after last edit
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      useDocumentStore.getState().addHistorySnapshot(activeDocumentId, currentEditor.document);
    }, 30000);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-16 xl:px-24 pb-[45vh] flex-1 relative" style={{ fontFamily }}>
      <BlockNoteView 
        editor={currentEditor} 
        onChange={handleChange}
        theme={isDarkMode ? "dark" : "light"}
        className="notion-blocknote" 
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) => {
            const defaultItems = getDefaultReactSlashMenuItems(currentEditor).filter(i => i.title !== "Code Block");
            const items = [...defaultItems, insertPage(currentEditor), insertMonacoCode(currentEditor)];
            return items.filter(i => 
              i.title.toLowerCase().includes(query.toLowerCase()) || 
              (i.aliases && i.aliases.some(a => a.toLowerCase().includes(query.toLowerCase())))
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
}
