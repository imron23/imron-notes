import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
  ChevronDown,
  Settings2,
  AlignLeft,
  Superscript,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ColorEntry = { name: string; value: string; hex: string };

// ─── Color palette ───────────────────────────────────────────────────────────
const TEXT_COLORS: ColorEntry[] = [
  { name: "Default",  value: "default", hex: "#37352f" },
  { name: "Gray",     value: "gray",    hex: "#9b9a97" },
  { name: "Brown",    value: "brown",   hex: "#64473a" },
  { name: "Orange",   value: "orange",  hex: "#d9730d" },
  { name: "Yellow",   value: "yellow",  hex: "#dfab01" },
  { name: "Green",    value: "green",   hex: "#0f7b6c" },
  { name: "Blue",     value: "blue",    hex: "#0b6e99" },
  { name: "Purple",   value: "purple",  hex: "#6940a5" },
  { name: "Pink",     value: "pink",    hex: "#ad1a72" },
  { name: "Red",      value: "red",     hex: "#e03e3e" },
];

const BG_COLORS: ColorEntry[] = [
  { name: "Default BG", value: "default", hex: "transparent" },
  { name: "Gray BG",    value: "gray",    hex: "#ebeced" },
  { name: "Brown BG",   value: "brown",   hex: "#e9e5e3" },
  { name: "Orange BG",  value: "orange",  hex: "#faebd7" },
  { name: "Yellow BG",  value: "yellow",  hex: "#fbf3db" },
  { name: "Green BG",   value: "green",   hex: "#ddedea" },
  { name: "Blue BG",    value: "blue",    hex: "#ddebf1" },
  { name: "Purple BG",  value: "purple",  hex: "#eae4f2" },
  { name: "Pink BG",    value: "pink",    hex: "#f4dfeb" },
  { name: "Red BG",     value: "red",     hex: "#fbe4e4" },
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

// ─── Separator ───────────────────────────────────────────────────────────────
function Sep() {
  return <div className="notion-tb-sep" />;
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
interface TBtnProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
function TBtn({ label, active, onClick, children, className = "" }: TBtnProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
  }, [onClick]);

  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={handleMouseDown}
      className={`notion-tb-btn${active ? " notion-tb-btn--active" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}

// ─── Color picker popover ─────────────────────────────────────────────────────
interface ColorPickerProps {
  onClose: () => void;
  onTextColor: (v: string) => void;
  onBgColor: (v: string) => void;
  activeText: string;
  activeBg: string;
}
function ColorPicker({ onClose, onTextColor, onBgColor, activeText, activeBg }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click using pointer events (not just mouse)
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same event that opened it from closing it
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  const dotStyle = (hex: string, isDefault: boolean) => ({
    background: isDefault ? "#fff" : hex,
    border: isDefault ? "1.5px solid rgba(55,53,47,0.2)" : "none",
  });

  return (
    <div ref={ref} className="notion-color-picker">
      {/* Text Color */}
      <p className="notion-cp-label">Text color</p>
      <div className="notion-cp-grid">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.name}
            className={`notion-cp-dot${activeText === c.value ? " notion-cp-dot--active" : ""}`}
            style={dotStyle(c.hex, c.value === "default")}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTextColor(c.value);
              onClose();
            }}
          />
        ))}
      </div>

      <div className="notion-cp-divider" />

      {/* Background Color */}
      <p className="notion-cp-label">Background</p>
      <div className="notion-cp-grid">
        {BG_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.name}
            className={`notion-cp-dot${activeBg === c.value ? " notion-cp-dot--active" : ""}`}
            style={dotStyle(c.hex, c.value === "default")}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBgColor(c.value);
              onClose();
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Link popover ─────────────────────────────────────────────────────────────
interface LinkPopoverProps {
  initialUrl: string;
  onConfirm: (url: string) => void;
  onClose: () => void;
}
function LinkPopover({ initialUrl, onConfirm, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { onConfirm(url); onClose(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <div ref={ref} className="notion-link-popover">
      <input
        ref={inputRef}
        type="url"
        placeholder="Paste or type a link…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        className="notion-link-input"
      />
      <button
        className="notion-link-btn"
        onMouseDown={(e) => { e.preventDefault(); onConfirm(url); onClose(); }}
      >
        Apply
      </button>
    </div>
  );
}

// ─── AI Skills menu ───────────────────────────────────────────────────────────
interface SkillsMenuProps {
  onClose: () => void;
  onSkill: (label: string) => void;
}
function SkillsMenu({ onClose, onSkill }: SkillsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="notion-skills-menu">
      <p className="notion-skills-label">
        <Settings2 size={11} style={{ marginRight: 4 }} />
        Skills
      </p>
      {AI_SKILLS.map((s) => (
        <button
          key={s.label}
          className="notion-skills-item"
          onMouseDown={(e) => {
            e.preventDefault();
            onSkill(s.label);
            onClose();
          }}
        >
          <span className="notion-skills-icon">{s.icon}</span>
          {s.label}
        </button>
      ))}
      <div className="notion-skills-divider" />
      <button
        className="notion-skills-edit-ai"
        onMouseDown={(e) => {
          e.preventDefault();
          onSkill("Edit with AI");
          onClose();
        }}
      >
        <Wand2 size={13} />
        Edit with AI
        <kbd className="notion-skills-kbd">⌘^E</kbd>
      </button>
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
type PopoverType = "color" | "link" | "skills" | null;

function NotionFormattingToolbar() {
  const editor = useBlockNoteEditor();
  const [fmts, setFmts] = useState<Record<string, boolean>>({});
  const [activeTextColor, setActiveTextColor] = useState("default");
  const [activeBgColor, setActiveBgColor] = useState("default");
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [linkUrl, setLinkUrl] = useState("");

  // Sync active styles when selection changes
  useEditorSelectionChange(() => {
    const styles = editor.getActiveStyles() as Record<string, unknown>;
    setFmts({
      bold:      !!styles.bold,
      italic:    !!styles.italic,
      underline: !!styles.underline,
      strike:    !!styles.strike,
      code:      !!styles.code,
    });
    setActiveTextColor(typeof styles.textColor === "string" ? styles.textColor : "default");
    setActiveBgColor(typeof styles.backgroundColor === "string" ? styles.backgroundColor : "default");
    // Also update current link URL
    const linkUrl = editor.getSelectedLinkUrl?.() ?? "";
    setLinkUrl(linkUrl);
  }, editor);

  const closePopover = useCallback(() => setActivePopover(null), []);
  const togglePopover = useCallback((name: PopoverType) => {
    setActivePopover((prev) => (prev === name ? null : name));
  }, []);

  // Formatting toggle
  const toggle = useCallback(
    (style: string) => {
      setActivePopover(null);
      (editor as unknown as { toggleStyles(s: Record<string, boolean>): void })
        .toggleStyles({ [style]: true });
      editor.focus();
    },
    [editor]
  );

  // Text color
  const applyTextColor = useCallback(
    (color: string) => {
      if (color === "default") {
        (editor as unknown as { removeStyles(s: Record<string, unknown>): void })
          .removeStyles({ textColor: true });
      } else {
        (editor as unknown as { addStyles(s: Record<string, string>): void })
          .addStyles({ textColor: color });
      }
      setActiveTextColor(color);
      setActivePopover(null);
      editor.focus();
    },
    [editor]
  );

  // Background color
  const applyBgColor = useCallback(
    (color: string) => {
      if (color === "default") {
        (editor as unknown as { removeStyles(s: Record<string, unknown>): void })
          .removeStyles({ backgroundColor: true });
      } else {
        (editor as unknown as { addStyles(s: Record<string, string>): void })
          .addStyles({ backgroundColor: color });
      }
      setActiveBgColor(color);
      setActivePopover(null);
      editor.focus();
    },
    [editor]
  );

  // Link
  const openLink = useCallback(() => {
    const url = editor.getSelectedLinkUrl?.() ?? "";
    setLinkUrl(url);
    togglePopover("link");
  }, [editor, togglePopover]);

  const confirmLink = useCallback(
    (url: string) => {
      if (url.trim()) {
        editor.createLink(url.trim());
        editor.focus();
      }
    },
    [editor]
  );

  // Current color bar hex
  const colorBarHex =
    TEXT_COLORS.find((c) => c.value === activeTextColor)?.hex ?? "#37352f";

  return (
    <div className="notion-toolbar">
      <div className="notion-tb-row">
        {/* Color button */}
        <div className="notion-tb-color-wrap">
          <TBtn
            label="Text & background color"
            onClick={() => togglePopover("color")}
          >
            <span className="notion-tb-color-icon">
              <span className="notion-tb-color-A">A</span>
              <span className="notion-tb-color-bar" style={{ background: colorBarHex }} />
            </span>
          </TBtn>
          {activePopover === "color" && (
            <ColorPicker
              onClose={closePopover}
              onTextColor={applyTextColor}
              onBgColor={applyBgColor}
              activeText={activeTextColor}
              activeBg={activeBgColor}
            />
          )}
        </div>

        <Sep />

        <TBtn label="Bold (⌘B)"       active={fmts.bold}      onClick={() => toggle("bold")}><Bold size={16} /></TBtn>
        <TBtn label="Italic (⌘I)"     active={fmts.italic}    onClick={() => toggle("italic")}><Italic size={16} /></TBtn>
        <TBtn label="Underline (⌘U)"  active={fmts.underline} onClick={() => toggle("underline")}><Underline size={16} /></TBtn>

        <Sep />

        {/* Link button */}
        <div className="notion-tb-color-wrap">
          <TBtn label="Link (⌘K)" onClick={openLink}><Link size={16} /></TBtn>
          {activePopover === "link" && (
            <LinkPopover
              initialUrl={linkUrl}
              onConfirm={confirmLink}
              onClose={closePopover}
            />
          )}
        </div>

        <TBtn label="Strikethrough"  active={fmts.strike} onClick={() => toggle("strike")}><Strikethrough size={16} /></TBtn>
        <TBtn label="Inline code"    active={fmts.code}   onClick={() => toggle("code")}><Code size={16} /></TBtn>
        <TBtn label="Superscript"><Superscript size={16} /></TBtn>

        <Sep />

        <TBtn label="More options"><MoreHorizontal size={16} /></TBtn>

        <Sep />

        <TBtn label="Comment"><MessageSquare size={16} /></TBtn>
        <TBtn label="Emoji reaction"><Smile size={16} /></TBtn>
        <TBtn label="Turn into"><AlignLeft size={16} /></TBtn>

        <Sep />

        {/* AI / Skills */}
        <div className="notion-tb-skills-wrap">
          <TBtn
            label="AI Skills"
            className="notion-tb-ai-btn"
            onClick={() => togglePopover("skills")}
          >
            <Wand2 size={13} />
            <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>Ask AI</span>
            <ChevronDown size={11} style={{ marginLeft: 2, opacity: 0.6 }} />
          </TBtn>
          {activePopover === "skills" && (
            <SkillsMenu
              onClose={closePopover}
              onSkill={() => { editor.focus(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function NotionToolbarController() {
  return (
    <FormattingToolbarController
      formattingToolbar={NotionFormattingToolbar}
    />
  );
}
