import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { useDocumentStore } from "../../../store/useDocumentStore";
import { FileText } from "lucide-react";

const PageLinkComponent = (props: any) => {
  // Find updated title from store directly instead of stored props to keep sync
  const documents = useDocumentStore(state => state.documents);
  
  const findTitle = (docs: any[], id: string): string => {
     for (const doc of docs) {
        if (doc.id === id) return doc.icon ? `${doc.icon} ${doc.title}` : doc.title;
        if (doc.children && doc.children.length > 0) {
           const found = findTitle(doc.children, id);
           if (found) return found;
        }
     }
     return "";
  };
  
  const realTitle = findTitle(documents, props.block.props.pageId) || props.block.props.pageTitle;

  return (
    <div 
      className="flex items-center gap-2 px-2 py-1 my-1 hover:bg-[#e8e8e6] rounded cursor-pointer transition w-fit select-none border border-transparent hover:border-[#d8d8d6]"
      onClick={() => {
        if (props.block.props.pageId) {
           useDocumentStore.getState().setActiveDocument(props.block.props.pageId);
        }
      }}
      contentEditable={false}
    >
      <FileText size={18} className="text-notion-text-sub" />
      <span className="font-medium underline underline-offset-4 decoration-notion-text-sub text-notion-text-main">
          {realTitle}
      </span>
    </div>
  );
};

export const PageLinkBlock = createReactBlockSpec(
  {
    type: "pageLink",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      pageId: { default: "" },
      pageTitle: { default: "Untitled" }
    },
    content: "none",
  },
  {
    render: (props) => <PageLinkComponent {...props} />,
  }
);
