"use client";

import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Bold, Italic, Underline as UnderlineIcon, Code, Type, List, ListOrdered, Palette } from "lucide-react";
import { GifPicker } from "./GifPicker";
import { EmojiPicker } from "./EmojiPicker";

// ─── Public ref API ───────────────────────────────────────────────────────────

export interface RichTextEditorRef {
  focus: () => void;
  clear: () => void;
  isEmpty: () => boolean;
  getHTML: () => string;
  /** Replace the last @word before the cursor with @name + space */
  insertMention: (name: string) => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  placeholder?:   string;
  disabled?:      boolean;
  /** Called on every keystroke; receives plain-text content and text-before-cursor */
  onChange?:      (text: string, textBeforeCursor: string) => void;
  /** Called when the user presses Enter (without Shift) */
  onEnter?:       () => void;
  /** Extra classes applied to the outer wrapper div */
  className?:     string;
  /** Extra nodes rendered on the right side of the toolbar (e.g. Paperclip button) */
  toolbarExtra?:  React.ReactNode;
  /** Called when the user selects a GIF — receives a direct image URL */
  onSendWithImage?: (imageUrl: string) => void;
  /** Minimum height for the editor content area (in px). Default 0 (natural height). */
  minHeight?:     number;
  /** Hvis true: viser format-knappene (B/I/U/lister/Code) som standard. */
  showFormatByDefault?: boolean;
  /** Hvis true: ⌘+Enter sender, vanlig Enter lager linjeskift (passer for innlegg). */
  enterMakesNewline?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RichTextEditor = forwardRef<RichTextEditorRef, Props>(function RichTextEditor(
  {
    placeholder = "Skriv en melding…",
    disabled = false,
    onChange, onEnter, className = "",
    toolbarExtra, onSendWithImage,
    minHeight,
    showFormatByDefault = false,
    enterMakesNewline = false,
  },
  ref,
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading / horizontal rule / blockquote — overkill for chat
        heading:       false,
        horizontalRule: false,
        blockquote:    false,
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: { class: "tiptap" },
    },
    onUpdate({ editor: ed }) {
      if (!onChange) return;
      const text = ed.getText();
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(0, from, "\n");
      onChange(text, textBefore);
    },
  });

  const [showEmoji,   setShowEmoji]   = useState(false);
  const [showGif,     setShowGif]     = useState(false);
  const [showFormat,  setShowFormat]  = useState(showFormatByDefault);
  const [showColor,   setShowColor]   = useState(false);

  // Aurora-palette + nøytrale farger for tekstfarge-velgeren
  const COLORS = [
    { name: "Standard", value: null,       hex: "#F0F4FF" },
    { name: "Teal",     value: "#5EEAD4",  hex: "#5EEAD4" },
    { name: "Lilla",    value: "#A855F7",  hex: "#A855F7" },
    { name: "Blå",      value: "#60A5FA",  hex: "#60A5FA" },
    { name: "Pink",     value: "#F472B6",  hex: "#F472B6" },
    { name: "Gull",     value: "#FBBF24",  hex: "#FBBF24" },
    { name: "Rose",     value: "#F87171",  hex: "#F87171" },
  ];

  const handleEmojiSelect = useCallback((emoji: string) => {
    editor?.commands.insertContent(emoji);
    editor?.commands.focus();
  }, [editor]);

  const handleGifSelect = useCallback((url: string) => {
    onSendWithImage?.(url);
  }, [onSendWithImage]);

  // ── Expose ref API ────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    clear: () => editor?.commands.clearContent(true),
    isEmpty: () => editor?.isEmpty ?? true,
    getHTML: () => editor?.getHTML() ?? "",
    insertMention(name: string) {
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(0, from, "\n");
      const match = textBefore.match(/@\w*$/);
      if (match) {
        const start = from - match[0].length;
        editor.chain().focus().deleteRange({ from: start, to: from }).insertContent(`@${name} `).run();
      } else {
        editor.chain().focus().insertContent(`@${name} `).run();
      }
    },
  }));

  // ── Keyboard: Enter = send, Shift+Enter = newline ─────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (enterMakesNewline) {
      // For innlegg: ⌘/Ctrl + Enter sender, vanlig Enter = newline (default TipTap)
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onEnter?.();
      }
      return;
    }
    // For chat: Enter sender, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
    }
  }

  // ── Toolbar helpers ───────────────────────────────────────────────────────

  function ToolBtn({
    active, onClick, title, children,
  }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        title={title}
        className="nav-link flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        style={{
          background: active ? "rgba(94,234,212,0.12)" : "transparent",
          color:      active ? "#5EEAD4" : "rgba(240,244,255,0.55)",
        }}
      >
        {children}
      </button>
    );
  }

  if (!editor) return null;

  return (
    <div
      className={`flex flex-col rounded-xl transition-colors focus-within:border-[#5EEAD4]/40 ${minHeight ? "tiptap-tall" : ""} ${className}`}
      style={{
        background: "#131A35",
        border:     "1px solid rgba(240,244,255,0.08)",
        ...(minHeight ? { ["--tiptap-min-h" as string]: `${minHeight}px` } : {}),
      }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5">
        {/* Format-toggle — skjuler B/I/U/Code som standard så toolbaren er ren */}
        <ToolBtn active={showFormat} onClick={() => setShowFormat((v) => !v)} title="Formatering">
          <Type className="h-3.5 w-3.5" />
        </ToolBtn>

        {showFormat && (
          <>
            <span className="mx-0.5 h-4 w-px" style={{ background: "rgba(240,244,255,0.08)" }} />
            <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Fet (⌘B)">
              <Bold className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (⌘I)">
              <Italic className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Understrek (⌘U)">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <span className="mx-0.5 h-4 w-px" style={{ background: "rgba(240,244,255,0.08)" }} />
            <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Punktliste">
              <List className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerert liste">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Kode">
              <Code className="h-3.5 w-3.5" />
            </ToolBtn>
            <span className="mx-0.5 h-4 w-px" style={{ background: "rgba(240,244,255,0.08)" }} />
            {/* Color-picker — popover med Aurora-palette */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowColor((v) => !v); }}
                title="Tekstfarge"
                className="nav-link flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ color: editor.getAttributes("textStyle").color ?? "rgba(240,244,255,0.55)" }}
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              {showColor && (
                <div
                  className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg p-1.5 shadow-2xl"
                  style={{ background: "#0B1027", border: "1px solid rgba(240,244,255,0.08)" }}
                >
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (c.value === null) editor.chain().focus().unsetColor().run();
                        else                  editor.chain().focus().setColor(c.value).run();
                        setShowColor(false);
                      }}
                      title={c.name}
                      className="h-5 w-5 rounded transition-transform hover:scale-110"
                      style={{
                        background: c.hex,
                        border: c.value === null ? "1px dashed rgba(240,244,255,0.3)" : "1px solid rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowEmoji((v) => !v); setShowGif(false); }}
              title="Emoji"
              className="nav-link flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              style={{ color: "rgba(240,244,255,0.55)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            {showEmoji && (
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowGif((v) => !v); setShowEmoji(false); }}
              title="Send GIF"
              className="nav-link flex h-7 items-center justify-center rounded-md px-1.5 transition-colors"
              style={{ color: "rgba(240,244,255,0.55)" }}
            >
              <span className="text-[11px] font-bold leading-none">GIF</span>
            </button>
            {showGif && (
              <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />
            )}
          </div>
          {toolbarExtra}
        </div>
      </div>

      {/* Content area */}
      <EditorContent
        editor={editor}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="px-3 pb-2.5 text-sm text-white"
      />
    </div>
  );
});

export default RichTextEditor;
