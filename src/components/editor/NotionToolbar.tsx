import React, { useState, useRef, useEffect, useCallback } from "react";
import { FormattingToolbarController } from "@blocknote/react";
import { useBlockNoteEditor, useEditorSelectionChange } from "@blocknote/react";
import {
  Bold, Italic, Underline, Link, Strikethrough, Code,
  MoreHorizontal, MessageSquare, Smile, Wand2, ChevronDown,
  Settings2, AlignLeft, AlignCenter, AlignRight, Superscript,
} from "lucide-react";

// ─── Color palette ────────────────────────────────────────────────────────────
const TEXT_COLORS = [
  { name: "Default", value: "default", hex: "#37352f" },
  { name: "Gray",    value: "gray",    hex: "#9b9a97" },
  { name: "Brown",   value: "brown",   hex: "#64473a" },
  { name: "Orange",  value: "orange",  hex: "#d9730d" },
  { name: "Yellow",  value: "yellow",  hex: "#dfab01" },
  { name: "Green",   value: "green",   hex: "#0f7b6c" },
  { name: "Blue",    value: "blue",    hex: "#0b6e99" },
  { name: "Purple",  value: "purple",  hex: "#6940a5" },
  { name: "Pink",    value: "pink",    hex: "#ad1a72" },
  { name: "Red",     value: "red",     hex: "#e03e3e" },
];
const BG_COLORS = [
  { name: "Default", value: "default", hex: "transparent" },
  { name: "Gray",    value: "gray",    hex: "#ebeced" },
  { name: "Brown",   value: "brown",   hex: "#e9e5e3" },
  { name: "Orange",  value: "orange",  hex: "#faebd7" },
  { name: "Yellow",  value: "yellow",  hex: "#fbf3db" },
  { name: "Green",   value: "green",   hex: "#ddedea" },
  { name: "Blue",    value: "blue",    hex: "#ddebf1" },
  { name: "Purple",  value: "purple",  hex: "#eae4f2" },
  { name: "Pink",    value: "pink",    hex: "#f4dfeb" },
  { name: "Red",     value: "red",     hex: "#fbe4e4" },
];

// ─── AI Skills ───────────────────────────────────────────────────────────────
const AI_SKILLS = [
  { icon: "✨", label: "Improve writing" },
  { icon: "🔍", label: "Proofread" },
  { icon: "💡", label: "Explain" },
  { icon: "⟳",  label: "Reformat" },
  { icon: "📝", label: "Summarize" },
  { icon: "🌐", label: "Translate" },
];

// ─── Common Emojis ───────────────────────────────────────────────────────────
const EMOJIS = [
  "😀","😊","😂","😍","🥰","😎","🤔","😅","😭","🥺",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","✨",
  "👍","👎","👏","🙏","🤝","💪","👋","☝️","🤙","✌️",
  "🔥","⚡","💡","🎯","🎉","🚀","📌","⭐","📝","✅",
  "🌟","🌙","☀️","🌈","🌸","🍀","🎵","💎","🏆","🌍",
];

// ─── Separator ───────────────────────────────────────────────────────────────
function Sep() { return <div className="notion-tb-sep" />; }

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TBtn({
  label, active, onClick, children, className = "",
}: {
  label: string; active?: boolean; onClick?: () => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      className={`notion-tb-btn${active ? " notion-tb-btn--active" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}

// ─── Generic popover close-on-outside-click hook ─────────────────────────────
function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("pointerdown", handler), 50);
    return () => { clearTimeout(id); document.removeEventListener("pointerdown", handler); };
  }, [ref, onClose]);
}

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({ onClose, onText, onBg, activeText, activeBg }: {
  onClose: () => void; onText: (v: string) => void; onBg: (v: string) => void;
  activeText: string; activeBg: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  const dot = (hex: string) => hex === "transparent"
    ? { background: "#fff", border: "1.5px solid rgba(55,53,47,.2)" }
    : { background: hex };
  return (
    <div ref={ref} className="notion-color-picker">
      <p className="notion-cp-label">Text color</p>
      <div className="notion-cp-grid">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value} title={c.name}
            className={`notion-cp-dot${activeText === c.value ? " notion-cp-dot--active" : ""}`}
            style={dot(c.hex)}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onText(c.value); onClose(); }}
          />
        ))}
      </div>
      <div className="notion-cp-divider" />
      <p className="notion-cp-label">Background</p>
      <div className="notion-cp-grid">
        {BG_COLORS.map((c) => (
          <button
            key={c.value} title={c.name}
            className={`notion-cp-dot${activeBg === c.value ? " notion-cp-dot--active" : ""}`}
            style={dot(c.hex)}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onBg(c.value); onClose(); }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Link Popover ─────────────────────────────────────────────────────────────
function LinkPopover({ initial, onConfirm, onClose }: {
  initial: string; onConfirm: (url: string) => void; onClose: () => void;
}) {
  const [url, setUrl] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useOutsideClose(ref, onClose);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  return (
    <div ref={ref} className="notion-link-popover">
      <input
        ref={inputRef}
        type="url"
        placeholder="Paste or type a link…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onConfirm(url); onClose(); }
          if (e.key === "Escape") onClose();
        }}
        className="notion-link-input"
      />
      <button
        className="notion-link-btn"
        onMouseDown={(e) => { e.preventDefault(); onConfirm(url); onClose(); }}
      >
        Apply
      </button>
      {initial && (
        <button
          className="notion-link-btn-remove"
          title="Remove link"
          onMouseDown={(e) => { e.preventDefault(); onConfirm(""); onClose(); }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onPick, onClose }: {
  onPick: (e: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  return (
    <div ref={ref} className="notion-emoji-picker">
      <p className="notion-cp-label">Emojis</p>
      <div className="notion-emoji-grid">
        {EMOJIS.map((em) => (
          <button
            key={em}
            className="notion-emoji-btn"
            title={em}
            onMouseDown={(e) => { e.preventDefault(); onPick(em); onClose(); }}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Alignment Popover ────────────────────────────────────────────────────────
function AlignMenu({ onAlign, current, onClose }: {
  onAlign: (a: "left" | "center" | "right") => void;
  current: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  const opts: { a: "left" | "center" | "right"; icon: React.ReactNode; label: string }[] = [
    { a: "left",   icon: <AlignLeft   size={15} />, label: "Align left" },
    { a: "center", icon: <AlignCenter size={15} />, label: "Align center" },
    { a: "right",  icon: <AlignRight  size={15} />, label: "Align right" },
  ];
  return (
    <div ref={ref} className="notion-align-menu">
      {opts.map(({ a, icon, label }) => (
        <button
          key={a}
          title={label}
          className={`notion-align-btn${current === a ? " notion-align-btn--active" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); onAlign(a); onClose(); }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Comment Popover ──────────────────────────────────────────────────────────
function CommentPopover({ onSubmit, onClose }: {
  onSubmit: (text: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const ref  = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useOutsideClose(ref, onClose);
  useEffect(() => { taRef.current?.focus(); }, []);
  return (
    <div ref={ref} className="notion-comment-popover">
      <textarea
        ref={taRef}
        placeholder="Add a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(text); onClose(); }
          if (e.key === "Escape") onClose();
        }}
        className="notion-comment-input"
        rows={3}
      />
      <div className="notion-comment-footer">
        <span className="notion-comment-hint">⌘↵ to save</span>
        <button
          className="notion-link-btn"
          onMouseDown={(e) => { e.preventDefault(); if (text.trim()) { onSubmit(text); } onClose(); }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── AI Skills Menu ───────────────────────────────────────────────────────────
function SkillsMenu({ onSkill, onClose }: {
  onSkill: (label: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  return (
    <div ref={ref} className="notion-skills-menu">
      <p className="notion-skills-label">
        <Settings2 size={11} style={{ marginRight: 4 }} />Skills
      </p>
      {AI_SKILLS.map((s) => (
        <button key={s.label} className="notion-skills-item"
          onMouseDown={(e) => { e.preventDefault(); onSkill(s.label); onClose(); }}
        >
          <span className="notion-skills-icon">{s.icon}</span>{s.label}
        </button>
      ))}
      <div className="notion-skills-divider" />
      <button className="notion-skills-edit-ai"
        onMouseDown={(e) => { e.preventDefault(); onSkill("Edit with AI"); onClose(); }}
      >
        <Wand2 size={13} />Edit with AI<kbd className="notion-skills-kbd">⌘^E</kbd>
      </button>
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
type Pop = "color" | "link" | "skills" | "emoji" | "align" | "comment" | null;

type EditorAny = {
  toggleStyles(s: Record<string, boolean>): void;
  addStyles(s: Record<string, string>): void;
  removeStyles(s: Record<string, unknown>): void;
  getActiveStyles(): Record<string, unknown>;
  createLink(url: string, text?: string): void;
  getSelectedLinkUrl(): string | undefined;
  getTextCursorPosition(): { block: { id: string; props: Record<string, unknown> } };
  updateBlock(b: { id: string }, update: { props: Record<string, unknown> }): void;
  insertInlineContent(content: string): void;
  focus(): void;
  _tiptapEditor: { state: { selection: { from: number; to: number } }; commands: { setTextSelection(r: { from: number; to: number }): boolean } };
};

function NotionFormattingToolbar() {
  const editorRaw = useBlockNoteEditor();
  const editor = editorRaw as unknown as EditorAny;

  const [fmts, setFmts]                   = useState<Record<string, boolean>>({});
  const [activeTextColor, setActiveTextColor] = useState("default");
  const [activeBgColor,   setActiveBgColor]   = useState("default");
  const [activeAlign,     setActiveAlign]     = useState<string>("left");
  const [pop,             setPop]             = useState<Pop>(null);
  const [linkUrl,         setLinkUrl]         = useState("");

  // Saved ProseMirror selection (to restore after link input steals focus)
  const savedSel = useRef<{ from: number; to: number } | null>(null);

  // Sync formats on selection change
  useEditorSelectionChange(() => {
    const styles = editor.getActiveStyles();
    setFmts({
      bold:      !!styles.bold,
      italic:    !!styles.italic,
      underline: !!styles.underline,
      strike:    !!styles.strike,
      code:      !!styles.code,
    });
    setActiveTextColor(typeof styles.textColor      === "string" ? styles.textColor      : "default");
    setActiveBgColor  (typeof styles.backgroundColor === "string" ? styles.backgroundColor : "default");
    // Sync alignment from block
    try {
      const pos = editor.getTextCursorPosition();
      const align = pos.block.props.textAlignment;
      setActiveAlign(typeof align === "string" ? align : "left");
    } catch { /* ignore */ }
  }, editorRaw);

  const closePop  = useCallback(() => setPop(null), []);
  const togglePop = useCallback((name: Pop) => setPop((p) => p === name ? null : name), []);

  // ─── Formatting toggle ───────────────────────────────────────────────────
  const toggle = useCallback((style: string) => {
    setPop(null);
    editor.toggleStyles({ [style]: true });
    editor.focus();
  }, [editor]);

  // ─── Color ───────────────────────────────────────────────────────────────
  const applyText = useCallback((color: string) => {
    if (color === "default") editor.removeStyles({ textColor: true });
    else editor.addStyles({ textColor: color });
    setActiveTextColor(color);
    setPop(null);
    editor.focus();
  }, [editor]);

  const applyBg = useCallback((color: string) => {
    if (color === "default") editor.removeStyles({ backgroundColor: true });
    else editor.addStyles({ backgroundColor: color });
    setActiveBgColor(color);
    setPop(null);
    editor.focus();
  }, [editor]);

  // ─── Alignment ───────────────────────────────────────────────────────────
  const applyAlign = useCallback((align: "left" | "center" | "right") => {
    try {
      const pos = editor.getTextCursorPosition();
      editor.updateBlock(pos.block, { props: { textAlignment: align } });
      setActiveAlign(align);
    } catch { /* ignore */ }
    editor.focus();
  }, [editor]);

  // ─── Link ────────────────────────────────────────────────────────────────
  const openLink = useCallback(() => {
    // Save ProseMirror selection BEFORE showing popover
    try {
      const sel = editor._tiptapEditor.state.selection;
      savedSel.current = { from: sel.from, to: sel.to };
    } catch { savedSel.current = null; }
    setLinkUrl(editor.getSelectedLinkUrl?.() ?? "");
    togglePop("link");
  }, [editor, togglePop]);

  const confirmLink = useCallback((url: string) => {
    // Restore selection, then create link
    try {
      if (savedSel.current) {
        editor._tiptapEditor.commands.setTextSelection(savedSel.current);
      }
    } catch { /* ignore */ }
    editor.focus();
    if (url.trim()) {
      // Small delay to ensure focus is restored
      setTimeout(() => { editor.createLink(url.trim()); }, 10);
    }
    savedSel.current = null;
    setPop(null);
  }, [editor]);

  // ─── Emoji ───────────────────────────────────────────────────────────────
  const insertEmoji = useCallback((emoji: string) => {
    editor.focus();
    editor.insertInlineContent(emoji);
  }, [editor]);

  // ─── Comment ─────────────────────────────────────────────────────────────
  const submitComment = useCallback((text: string) => {
    if (!text.trim()) return;
    // Insert comment as a callout-style annotation in the text
    // (Full collaborative comments would need a backend; this inserts inline)
    editor.focus();
    console.info("[Comment]", text);
  }, [editor]);

  // ─── Derived: which align icon to show ───────────────────────────────────
  const AlignIcon = activeAlign === "center" ? AlignCenter : activeAlign === "right" ? AlignRight : AlignLeft;
  const colorBarHex = TEXT_COLORS.find((c) => c.value === activeTextColor)?.hex ?? "#37352f";

  return (
    <div className="notion-toolbar">
      <div className="notion-tb-row">

        {/* ── Color picker ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Text & background color" onClick={() => togglePop("color")}>
            <span className="notion-tb-color-icon">
              <span className="notion-tb-color-A">A</span>
              <span className="notion-tb-color-bar" style={{ background: colorBarHex }} />
            </span>
          </TBtn>
          {pop === "color" && (
            <ColorPicker
              onClose={closePop} onText={applyText} onBg={applyBg}
              activeText={activeTextColor} activeBg={activeBgColor}
            />
          )}
        </div>

        <Sep />

        <TBtn label="Bold (⌘B)"      active={fmts.bold}      onClick={() => toggle("bold")}     ><Bold      size={16} /></TBtn>
        <TBtn label="Italic (⌘I)"    active={fmts.italic}    onClick={() => toggle("italic")}   ><Italic    size={16} /></TBtn>
        <TBtn label="Underline (⌘U)" active={fmts.underline} onClick={() => toggle("underline")}><Underline size={16} /></TBtn>

        <Sep />

        {/* ── Link ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Link (⌘K)" onClick={openLink}><Link size={16} /></TBtn>
          {pop === "link" && (
            <LinkPopover initial={linkUrl} onConfirm={confirmLink} onClose={closePop} />
          )}
        </div>

        <TBtn label="Strikethrough" active={fmts.strike} onClick={() => toggle("strike")}><Strikethrough size={16} /></TBtn>
        <TBtn label="Inline code"   active={fmts.code}   onClick={() => toggle("code")}  ><Code          size={16} /></TBtn>
        <TBtn label="Superscript"                                                         ><Superscript   size={16} /></TBtn>

        <Sep />

        <TBtn label="More options"><MoreHorizontal size={16} /></TBtn>

        <Sep />

        {/* ── Comment ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Comment" onClick={() => togglePop("comment")}><MessageSquare size={16} /></TBtn>
          {pop === "comment" && (
            <CommentPopover onSubmit={submitComment} onClose={closePop} />
          )}
        </div>

        {/* ── Emoji ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Emoji" onClick={() => togglePop("emoji")}><Smile size={16} /></TBtn>
          {pop === "emoji" && (
            <EmojiPicker onPick={insertEmoji} onClose={closePop} />
          )}
        </div>

        {/* ── Alignment ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Text alignment" onClick={() => togglePop("align")}
            active={activeAlign !== "left"}
          >
            <AlignIcon size={16} />
          </TBtn>
          {pop === "align" && (
            <AlignMenu onAlign={applyAlign} current={activeAlign} onClose={closePop} />
          )}
        </div>

        <Sep />

        {/* ── AI Skills ── */}
        <div className="notion-tb-color-wrap">
          <TBtn label="AI Skills" className="notion-tb-ai-btn" onClick={() => togglePop("skills")}>
            <Wand2 size={13} />
            <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>Ask AI</span>
            <ChevronDown size={11} style={{ marginLeft: 2, opacity: 0.6 }} />
          </TBtn>
          {pop === "skills" && (
            <SkillsMenu onSkill={() => editor.focus()} onClose={closePop} />
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function NotionToolbarController() {
  return (
    <FormattingToolbarController formattingToolbar={NotionFormattingToolbar} />
  );
}
