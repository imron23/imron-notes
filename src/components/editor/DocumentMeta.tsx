import React, { useRef, useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { Image, Smile } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function DocumentMeta() {
  const { activeDocumentId, documentContents, renameDocument, updateIcon, updateCover } = useDocumentStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeDocumentId) return null;
  const doc = documentContents[activeDocumentId];
  if (!doc) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    renameDocument(activeDocumentId, newTitle);
    
    // Auto resize
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'; // Reset
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`; // Set to content
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    updateIcon(activeDocumentId, emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const limitMb = useUIStore.getState().uploadLimitMb;
    const limitBytes = limitMb * 1024 * 1024;
    
    if (file.size > limitBytes) {
      alert(`File size exceeds the limit of ${limitMb}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateCover(activeDocumentId, base64);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onAddCover = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full relative group/meta">
      <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

      {/* Cover Image */}
      {doc.coverImage && (
        <div className="relative w-full h-60 group/cover mb-6" style={{overflow:'hidden'}}>
          <img src={doc.coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
          <div className="absolute top-4 right-4 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <button
              onClick={() => updateCover(activeDocumentId, '')}
              className="bg-white/85 backdrop-blur-sm text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-white text-gray-700 transition-all"
            >
              Remove Cover
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[720px] mx-auto px-12 xl:px-16 mb-4 relative">
        {!doc.coverImage && <div className="h-8" />}
        {/* Meta Actions */}
        <div className="flex gap-2 text-gray-400 opacity-0 group-hover/meta:opacity-100 transition-opacity absolute -top-6 left-12">
          {!doc.icon && (
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium hover:bg-gray-100 hover:text-gray-600 transition-all"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={14} /> Add icon
            </button>
          )}
          {!doc.coverImage && (
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium hover:bg-gray-100 hover:text-gray-600 transition-all"
              onClick={onAddCover}
            >
              <Image size={14} /> Add cover
            </button>
          )}
        </div>

        {/* Icon (Large) */}
        {doc.icon && (
          <div className="relative mb-3 mt-4">
            <button
              className="text-7xl cursor-pointer hover:scale-110 transition-transform rounded-xl p-1 inline-block"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {doc.icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-20 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>
        )}

        {/* Title Input */}
        <textarea
          ref={titleRef}
          value={doc.title === 'Untitled' ? '' : doc.title}
          placeholder="Untitled"
          onChange={handleTitleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          className="page-title-input w-full mt-3"
          rows={1}
          style={{ height: 'auto', minHeight: '56px' }}
        />
        
        {/* Invisible backdrop to dismiss emoji picker */}
        {showEmojiPicker && (
           <div 
             className="fixed inset-0 z-40" 
             onClick={() => setShowEmojiPicker(false)} 
           />
        )}
      </div>
    </div>
  );
}
