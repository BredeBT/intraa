"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createPost } from "@/server/actions/posts";
import { Send } from "lucide-react";

interface Props {
  orgId: string;
  userInitials: string;
}

export default function ComposeBox({ orgId, userInitials }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function handleSubmit() {
    const text = content.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      await createPost(orgId, text);
      setContent("");
      setOpen(false);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setOpen(false);
      setContent("");
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {userInitials}
        </div>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-400"
          >
            Skriv noe…
          </button>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKey}
              rows={3}
              placeholder="Hva vil du dele med teamet?"
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">⌘↵ for å sende · Esc for å avbryte</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setContent(""); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!content.trim() || isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isPending ? "Sender…" : "Del"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
