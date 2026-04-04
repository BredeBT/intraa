"use client";

import { useState } from "react";
import { Reply, Trash2, Paperclip } from "lucide-react";
import type { MessageWithAuthor } from "@/lib/types";

export interface Attachment {
  name: string;
  url:  string;
  type: "image" | "file";
  size: number;
}

export type LocalMessage = MessageWithAuthor & { attachment?: Attachment };

const EMOJIS = ["👍", "❤️", "😂", "😮"] as const;

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  message:   LocalMessage;
  isOwn:     boolean;
  reactions: Record<string, number>;
  onReact:   (emoji: string) => void;
  onDelete:  () => void;
  onReply:   () => void;
}

export default function MessageItem({ message, isOwn, reactions, onReact, onDelete, onReply }: Props) {
  const [hovered,   setHovered]   = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const hasReactions = Object.values(reactions).some((c) => c > 0);

  return (
    <div
      className="group relative flex items-start gap-3 rounded-lg px-2 py-1 -mx-2 transition-colors hover:bg-zinc-900/60"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiOpen(false); }}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
        {initials(message.author.name ?? "")}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-white">{message.author.name ?? ""}</span>
          <span className="text-xs text-zinc-500">{formatTime(message.createdAt)}</span>
        </div>

        {message.content && (
          <p className="mt-0.5 break-words text-sm text-zinc-300">{message.content}</p>
        )}

        {/* Attachment */}
        {message.attachment && (
          <div className="mt-2">
            {message.attachment.type === "image" ? (
              <img
                src={message.attachment.url}
                alt={message.attachment.name}
                className="max-h-52 max-w-xs rounded-lg object-cover"
              />
            ) : (
              <a
                href={message.attachment.url}
                download={message.attachment.name}
                className="flex w-fit items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="max-w-[200px] truncate">{message.attachment.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatSize(message.attachment.size)}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Reactions */}
        {hasReactions && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(reactions)
              .filter(([, c]) => c > 0)
              .map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs transition-colors hover:border-indigo-500 hover:bg-indigo-500/10"
                >
                  <span>{emoji}</span>
                  <span className="text-zinc-300">{count}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Hover toolbar */}
      {hovered && (
        <div className="absolute right-2 top-0 z-10 flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-0.5 shadow-xl">
          {/* Emoji picker toggle */}
          <div className="relative">
            <button
              onClick={() => setEmojiOpen((p) => !p)}
              className="rounded px-1 py-0.5 text-base leading-none transition-colors hover:bg-zinc-800"
              title="Reager"
            >
              😊
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full right-0 mb-1 flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { onReact(e); setEmojiOpen(false); }}
                    className="rounded p-1 text-base transition-colors hover:bg-zinc-800"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            onClick={onReply}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            title="Svar"
          >
            <Reply className="h-4 w-4" />
          </button>

          {/* Delete (own messages only) */}
          {isOwn && (
            <button
              onClick={onDelete}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-rose-400"
              title="Slett"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
