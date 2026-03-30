import React, { useState, useRef, useEffect, useCallback } from "react";
import { FormattingToolbarController } from "@blocknote/react";
import { useBlockNoteEditor, useEditorSelectionChange } from "@blocknote/react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  Strikethrough,
  Code,
  MoreHorizontal,
  MessageSquare,
  Smile,
  Wand2,
  ChevronRight,
  Settings2,
  Superscript,
  AlignLeft,
} from "lucide-react";

// ─── Color palette ───────────────────────────────────────────────────────────
const TEXT_COLORS = [
  { name: "Default", value: "default", hex: "#37352f" },
  { name: "Gray", value: "gray", hex: "#9b9a97" },
  { name: "Brown", value: "brown", hex: "#64473a" },
  { name: "Orange", value: "orange", hex: "#d9730d" },
  { name: "Yellow", value: "yellow", hex: "#dfab01" },
  { name: "Green", value: "green", hex: "#0f7b6c" },
  { name: "Blue", value: "blue", hex: "#0b6e99" },
  { name: "Purple", value: "purple", hex: "#6940a5" },
  { name: "Pink", value: "pink", hex: "#ad1a72" },
  { name: "Red", value: "red", hex: "#e03e3e" },
];

const BG_COLORS = [
  { name: "Default BG", value: "default", hex: "transparent" },
  { name: "Gray BG", value: "gray", hex: "#ebeced" },
  { name: "Brown BG", value: "brown", hex: "#e9e5e3" },
  { name: "Orange BG", value: "orange", hex: "#faebd7" },
  { name: "Yellow BG", value: "yellow", hex: "#fbf3db" },
  { name: "Green BG", value: "green", hex: "#ddedea" },
  { name: "Blue BG", value: "blue", hex: "#ddebf1" },
  { name: "Purple BG", value: "purple", hex: "#eae4f2" },
  { name: "Pink BG", value: "pink", hex: "#f4dfeb" },
  { name: "Red BG", value: "red", hex: "#fbe4e4" },
];

// ─── AI Skills config ────────────────────────────────────────────────────────
const AI_SKILLS = [
  { icon: "✨", label: "Improve writing" },
  { icon: "🔍", label: "Proofread" },
  { icon: "💡", label: "Explain" },
  { icon: "⟳", label: "Reformat" },
  { icon: "📝", label: "Summarize" },
  { icon: "🌐", label: "Translate" },
];

// ─── Separator component ─────────────────────────────────────────────────────
function ToolSep() {
  return <div className="notion-tb-sep" />;
}

// ─── Single toolbar button ────────────────────────────────────────────────────
interface TBtnProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}
function TBtn({ icon, label, active, onClick, children, className = "" }: TBtnProps) {
  return (
    <button
      title={label}
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      className={`notion-tb-btn ${active ? "notion-tb-btn--active" : ""} ${className}`}
    >
      {icon || children}
    </button>
  );
}

// ─── Color picker popover ─────────────────────────────────────────────────────
interface ColorPickerProps {
  onClose: () => void;
  onTextColor: (color: string) => void;
  onBgColor: (color: string) => void;
  activeTextColor?: string;
  activeBgColor?: string;
}
function ColorPicker({ onClose, onTextColor, onBgColor, activeTextColor, activeBgColor }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="notion-color-picker">
      <div className="notion-cp-section">
        <p className="notion-cp-label">Text color</p>
        <div className="notion-cp-grid">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.name}
              onMouseDown={(e) => { e.preventDefault(); onTextColor(c.value); }}
              className={`notion-cp-dot ${activeTextColor === c.value ? "notion-cp-dot--active" : ""}`}
              style={{ background: c.hex === "transparent" ? "#fff" : c.hex, border: c.hex === "transparent" ? "1.5px solid #ccc" : "none" }}
            />
          ))}
        </div>
      </div>
      <div className="notion-cp-divider" />
      <div className="notion-cp-section">
        <p className="notion-cp-label">Background</p>
        <div className="notion-cp-grid">
          {BG_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.name}
              onMouseDown={(e) => { e.preventDefault(); onBgColor(c.value); }}
              className={`notion-cp-dot ${activeBgColor === c.value ? "notion-cp-dot--active" : ""}`}
              style={{ background: c.hex === "transparent" ? "#fff" : c.hex, border: c.hex === "transparent" ? "1.5px solid #ccc" : "2px solid transparent" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skills submenu ──────────────────────────────────────────────────────────
interface SkillsMenuProps {
  onClose: () => void;
  onSkill: (label: string) => void;
}
function SkillsMenu({ onClose, onSkill }: SkillsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="notion-skills-menu">
      <p className="notion-skills-label">
        <Settings2 size={11} style={{ display: "inline", marginRight: 4 }} />
        Skills
      </p>
      {AI_SKILLS.map((s) => (
        <button
          key={s.label}
          className="notion-skills-item"
          onMouseDown={(e) => { e.preventDefault(); onSkill(s.label); onClose(); }}
        >
          <span className="notion-skills-icon">{s.icon}</span>
          {s.label}
        </button>
      ))}
      <div className="notion-skills-divider" />
      <button
        className="notion-skills-edit-ai"
        onMouseDown={(e) => { e.preventDefault(); onSkill("Edit with AI"); onClose(); }}
      >
        <Wand2 size={13} />
        Edit with AI
        <kbd className="notion-skills-kbd">⌘^E</kbd>
      </button>
    </div>
  );
}

// ─── The actual custom toolbar ────────────────────────────────────────────────
function NotionFormattingToolbar() {
  const editor = useBlockNoteEditor();
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTextColor, setActiveTextColor] = useState("default");
  const [activeBgColor, setActiveBgColor] = useState("default");

  // Sync active styles on selection change
  useEditorSelectionChange(() => {
    const styles = editor.getActiveStyles();
    setActiveFormats({
      bold: !!styles.bold,
      italic: !!styles.italic,
      underline: !!styles.underline,
      strike: !!styles.strike,
      code: !!styles.code,
    });
    const tc = (styles as Record<string, unknown>).textColor;
    const bc = (styles as Record<string, unknown>).backgroundColor;
    setActiveTextColor(typeof tc === "string" ? tc : "default");
    setActiveBgColor(typeof bc === "string" ? bc : "default");
  }, editor);

  const toggle = useCallback((style: string) => {
    (editor as unknown as { toggleStyles: (s: Record<string, boolean>) => void }).toggleStyles({ [style]: true });
    editor.focus();
  }, [editor]);

  const applyTextColor = useCallback((color: string) => {
    const e = editor as unknown as {
      addStyles: (s: Record<string, string>) => void;
      removeStyles: (s: Record<string, string>) => void;
    };
    if (color === "default") e.removeStyles({ textColor: "" });
    else e.addStyles({ textColor: color });
    setActiveTextColor(color);
    editor.focus();
  }, [editor]);

  const applyBgColor = useCallback((color: string) => {
    const e = editor as unknown as {
      addStyles: (s: Record<string, string>) => void;
      removeStyles: (s: Record<string, string>) => void;
    };
    if (color === "default") e.removeStyles({ backgroundColor: "" });
    else e.addStyles({ backgroundColor: color });
    setActiveBgColor(color);
    editor.focus();
  }, [editor]);

  const handleLink = useCallback(() => {
    const url = prompt("Enter URL:");
    if (url) {
      editor.createLink(url);
      editor.focus();
    }
  }, [editor]);

  // Current active text color dot
  const currentColorHex = TEXT_COLORS.find(c => c.value === activeTextColor)?.hex ?? "#37352f";

  return (
    <div className="notion-toolbar" onMouseDown={(e) => e.stopPropagation()}>
      <div className="notion-tb-row">

        {/* Color button */}
        <div className="notion-tb-color-wrap">
          <TBtn
            label="Text & background color"
            onClick={() => { setShowColorPicker(v => !v); setShowSkills(false); }}
          >
            <span className="notion-tb-color-icon">
              <span style={{ fontSize: 15, fontWeight: "bold", fontFamily: "serif", lineHeight: 1 }}>A</span>
              <span className="notion-tb-color-bar" style={{ background: currentColorHex }} />
            </span>
          </TBtn>
          {showColorPicker && (
            <ColorPicker
              onClose={() => setShowColorPicker(false)}
              onTextColor={applyTextColor}
              onBgColor={applyBgColor}
              activeTextColor={activeTextColor}
              activeBgColor={activeBgColor}
            />
          )}
        </div>

        <ToolSep />

        <TBtn icon={<Bold size={16} />}          label="Bold (⌘B)"        active={activeFormats.bold}      onClick={() => toggle("bold")} />
        <TBtn icon={<Italic size={16} />}        label="Italic (⌘I)"      active={activeFormats.italic}    onClick={() => toggle("italic")} />
        <TBtn icon={<Underline size={16} />}     label="Underline (⌘U)"   active={activeFormats.underline} onClick={() => toggle("underline")} />

        <ToolSep />

        <TBtn icon={<Link size={16} />}           label="Link (⌘K)"       onClick={handleLink} />
        <TBtn icon={<Strikethrough size={16} />}  label="Strikethrough"   active={activeFormats.strike}    onClick={() => toggle("strike")} />
        <TBtn icon={<Code size={16} />}           label="Inline code"     active={activeFormats.code}      onClick={() => toggle("code")} />
        <TBtn icon={<Superscript size={16} />}    label="Math / LaTeX" />

        <ToolSep />

        <TBtn icon={<MoreHorizontal size={16} />} label="More options" />

        <ToolSep />

        <TBtn icon={<MessageSquare size={16} />}  label="Comment" />
        <TBtn icon={<Smile size={16} />}          label="Add emoji reaction" />
        <TBtn icon={<AlignLeft size={16} />}      label="Turn into" />

        <ToolSep />

        {/* AI / Skills button */}
        <div className="notion-tb-skills-wrap">
          <TBtn
            label="AI Skills"
            onClick={() => { setShowSkills(v => !v); setShowColorPicker(false); }}
            className="notion-tb-ai-btn"
          >
            <Wand2 size={13} />
            <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 3 }}>Ask AI</span>
            <ChevronRight size={11} style={{ marginLeft: 1, opacity: 0.6 }} />
          </TBtn>
          {showSkills && (
            <SkillsMenu
              onClose={() => setShowSkills(false)}
              onSkill={() => { editor.focus(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exported wrapper ─────────────────────────────────────────────────────────
export function NotionToolbarController() {
  return (
    <FormattingToolbarController
      formattingToolbar={NotionFormattingToolbar}
    />
  );
}
