"use client";

import { forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon, Code } from "lucide-react";

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
  placeholder?: string;
  disabled?:    boolean;
  /** Called on every keystroke; receives plain-text content and text-before-cursor */
  onChange?:    (text: string, textBeforeCursor: string) => void;
  /** Called when the user presses Enter (without Shift) */
  onEnter?:     () => void;
  /** Extra classes applied to the outer wrapper div */
  className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RichTextEditor = forwardRef<RichTextEditorRef, Props>(function RichTextEditor(
  { placeholder = "Skriv en melding…", disabled = false, onChange, onEnter, className = "" },
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
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors
          ${active ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        {children}
      </button>
    );
  }

  if (!editor) return null;

  return (
    <div className={`flex flex-col rounded-xl border border-zinc-700 bg-zinc-800 transition-colors focus-within:border-indigo-500 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-zinc-700/60 px-2 py-1">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Fet (⌘B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (⌘I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Understrek (⌘U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Kode">
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      {/* Content area */}
      <EditorContent
        editor={editor}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="px-3 py-2 text-sm text-white"
      />
    </div>
  );
});

export default RichTextEditor;
