"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import type { LocalMessage } from "./MessageItem";

export interface ThreadMsg {
  id:         string;
  content:    string;
  authorName: string;
  createdAt:  Date;
}

interface Props {
  parent:     LocalMessage;
  replies:    ThreadMsg[];
  userName:   string;
  onAddReply: (content: string) => void;
  onClose:    () => void;
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ThreadPanel({ parent, replies, userName, onAddReply, onClose }: Props) {
  const [input, setInput] = useState("");

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    onAddReply(text);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <p className="text-sm font-semibold text-white">Tråd</p>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white">
            {initials(parent.author.name ?? "")}
          </div>
          <span className="text-xs font-semibold text-white">{parent.author.name}</span>
          <span className="text-[10px] text-zinc-600">{formatTime(parent.createdAt)}</span>
        </div>
        <p className="pl-8 text-xs leading-relaxed text-zinc-400">{parent.content}</p>
        <p className="mt-2 pl-8 text-[10px] text-zinc-600">
          {replies.length} {replies.length === 1 ? "svar" : "svar"}
        </p>
      </div>

      {/* Replies */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {replies.length === 0 && (
          <p className="mt-6 text-center text-xs text-zinc-600">
            Ingen svar ennå — vær den første!
          </p>
        )}
        {replies.map((r) => (
          <div key={r.id} className="flex items-start gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white">
              {initials(r.authorName)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-white">{r.authorName}</span>
                <span className="text-[10px] text-zinc-600">{formatTime(r.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-300">{r.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-bold text-white">
            {initials(userName)}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Svar på tråd…"
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-zinc-500 transition-colors hover:text-indigo-400 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
