import { useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { Trash2 } from 'lucide-react';

interface TrashModalProps {
  onClose: () => void;
}

export default function TrashModal({ onClose }: TrashModalProps) {
  const { archivedDocuments, restoreDocument, permanentlyDelete, emptyTrash } = useDocumentStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Click outside list deselects
  const handleBgClick = () => setSelectedId(null);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose} // Closes modal
    >
      <div 
        className="bg-[#ECECEC] w-[700px] h-[450px] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-300/50"
        onClick={(e) => { e.stopPropagation(); handleBgClick(); }}
      >
        {/* macOS Titlebar */}
        <div className="h-12 bg-gradient-to-b from-[#f5f5f5] to-[#e8e8e8] border-b border-gray-300 flex items-center px-4 relative flex-shrink-0 select-none">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2 absolute left-4">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center group">
              <svg className="hidden group-hover:block w-2 h-2 text-[#4d0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center group" />
            <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center group" />
          </div>
          
          <div className="flex-1 text-center font-medium text-[13px] text-gray-700 font-sans tracking-wide flex items-center justify-center gap-1.5">
             <Trash2 size={14} className="opacity-80" /> Trash
          </div>

          <div className="absolute right-4">
            <button 
               onClick={emptyTrash} 
               className="px-3 py-1 bg-white border border-gray-300 rounded-md text-[12px] font-medium text-gray-700 shadow-sm active:bg-gray-100 disabled:opacity-50 transition"
               disabled={archivedDocuments.length === 0}
            >
              Empty
            </button>
          </div>
        </div>

        {/* Content Area (List View) */}
        <div className="flex-1 bg-white overflow-y-auto">
          {/* Header Row */}
          <div className="flex items-center px-4 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 bg-white sticky top-0 z-10 select-none">
             <div className="flex-1 pl-6">Name</div>
             <div className="w-32">Date Modified</div>
             <div className="w-32 text-right pr-[4.5rem]">Kind</div>
          </div>
          
          {archivedDocuments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 select-none pb-12">
               <Trash2 size={56} className="mb-4 text-gray-300" strokeWidth={1.5} />
               <p className="text-[13px]">Trash is empty</p>
            </div>
          ) : (
            <div className="py-1">
              {archivedDocuments.map((doc) => {
                 const isSelected = selectedId === doc.id;
                 return (
                   <div 
                     key={doc.id}
                     className={`flex items-center px-4 py-1 text-[13px] cursor-default select-none group ${isSelected ? 'bg-[#0063e1] text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                     onClick={(e) => { e.stopPropagation(); setSelectedId(doc.id); }}
                   >
                     <div className="flex-1 flex items-center gap-2 max-w-[400px]">
                        <span className="text-base">{doc.icon || '📄'}</span>
                        <span className="truncate">{doc.title}</span>
                     </div>
                     <div className={`w-32 text-[12px] truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                        Today
                     </div>
                     <div className={`w-32 text-[12px] text-right pr-2 flex items-center justify-end gap-2`}>
                        <div className={`flex gap-1.5 opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); restoreDocument(doc.id); onClose(); }} 
                            className={`px-2 py-0.5 text-[11px] rounded shadow-sm border ${isSelected ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                          >
                            Put Back
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); permanentlyDelete(doc.id); }} 
                            className={`px-2 py-0.5 text-[11px] rounded shadow-sm border text-white ${isSelected ? 'bg-red-500 border-red-600 hover:bg-red-400' : 'bg-red-500 border-red-600 hover:bg-red-600'}`}
                          >
                            Delete
                          </button>
                        </div>
                     </div>
                   </div>
                 );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
