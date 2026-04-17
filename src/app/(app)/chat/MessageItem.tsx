"use client";

import { useState, useRef, useEffect } from "react";
import { Reply, Trash2, Pencil, Pin, PinOff, Paperclip, ChevronDown, ChevronRight, Send, X } from "lucide-react";
import type { MessageWithAuthor } from "@/lib/types";
import SafeHtml from "@/components/SafeHtml";
import { FanpassBadge } from "@/components/FanpassBadge";

export interface Attachment {
  name: string;
  url:  string;
  type: "image" | "file";
  size: number;
}

export type LocalMessage = MessageWithAuthor & { attachment?: Attachment };

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

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

/** Highlight @mentions — client-only to avoid SSR/hydration mismatch */
interface Props {
  message:      LocalMessage;
  isOwn:        boolean;
  canPin:       boolean;
  userId:       string;
  dmContacts:   { id: string; name: string }[];
  memberNames:  string[];
  onReact:      (msgId: string, emoji: string) => void;
  onEdit:       (msgId: string, newContent: string) => void;
  onDelete:     (msgId: string) => void;
  onReply:      (parentId: string, content: string) => void;
  onPin:        (msgId: string, isPinned: boolean) => void;
}

export default function MessageItem({
  message, isOwn, canPin, userId, dmContacts, memberNames,
  onReact, onEdit, onDelete, onReply, onPin,
}: Props) {
  const [emojiOpen,      setEmojiOpen]      = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [editContent,    setEditContent]    = useState(message.content);
  const [replying,       setReplying]       = useState(false);
  const [replyContent,   setReplyContent]   = useState("");
  const [expanded,       setExpanded]       = useState(false);
  const [lightbox,       setLightbox]       = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const editRef  = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing)  editRef.current?.focus();  }, [editing]);
  useEffect(() => { if (replying) replyRef.current?.focus(); }, [replying]);

  function saveEdit() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) { setEditing(false); return; }
    onEdit(message.id, trimmed);
    setEditing(false);
  }

  function submitReply() {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    onReply(message.id, trimmed);
    setReplyContent("");
    setReplying(false);
    setExpanded(true);
  }

  const replies      = message.replies ?? [];
  const replyCount   = message.replyCount ?? replies.length;

  return (
    <div className="group relative">
      <div className="flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-zinc-900">
        {/* Avatar */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
          {initials(message.author.name ?? "")}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white">{message.author.name ?? ""}</span>
            {message.author.hasFanpass && <FanpassBadge />}
            <span className="text-xs text-zinc-400">{formatTime(message.createdAt)}</span>
            {message.editedAt && (
              <span className="text-[10px] text-zinc-400 opacity-60">(redigert)</span>
            )}
            {message.isPinned && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                <Pin className="h-2.5 w-2.5" /> festet
              </span>
            )}
          </div>

          {/* Text / Edit mode */}
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                  if (e.key === "Escape") { setEditing(false); setEditContent(message.content); }
                }}
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-white outline-none focus:border-indigo-500"
              />
              <button onClick={saveEdit} className="text-xs font-medium text-indigo-400 hover:opacity-80">Lagre</button>
              <button onClick={() => { setEditing(false); setEditContent(message.content); }} className="text-xs text-zinc-400 hover:opacity-80">Avbryt</button>
            </div>
          ) : (
            message.content && (
              <div className="mt-0.5 text-sm leading-relaxed text-white">
                <SafeHtml content={message.content} />
              </div>
            )
          )}

          {/* Pasted / uploaded image */}
          {message.imageUrl && (
            <button
              onClick={() => setLightbox(message.imageUrl!)}
              className="mt-2 block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.imageUrl}
                alt=""
                className="max-h-48 max-w-xs rounded-lg object-cover ring-1 ring-zinc-700 transition-opacity hover:opacity-90"
              />
            </button>
          )}

          {/* File attachment */}
          {message.attachment && (
            <div className="mt-2">
              {message.attachment.type === "image" ? (
                <img src={message.attachment.url} alt={message.attachment.name}
                  className="max-h-52 max-w-xs rounded-lg object-cover" />
              ) : (
                <a href={message.attachment.url} download={message.attachment.name}
                  className="flex w-fit items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors hover:opacity-80">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="max-w-[200px] truncate">{message.attachment.name}</span>
                  <span className="shrink-0 text-xs opacity-60">{formatSize(message.attachment.size)}</span>
                </a>
              )}
            </div>
          )}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {message.reactions.map(({ emoji, count, reactedByMe }) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    reactedByMe
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-indigo-500"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Reply count / expand */}
          {replyCount > 0 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-1 flex items-center gap-1 text-xs text-indigo-400 hover:opacity-80"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {replyCount} {replyCount === 1 ? "svar" : "svar"}
            </button>
          )}
        </div>

        {/* Hover toolbar */}
        <div className="absolute right-2 top-0 z-10 hidden items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-800 px-1 py-0.5 shadow-xl group-hover:flex">
          {/* Emoji picker */}
          <div className="relative">
            <button
              onClick={() => setEmojiOpen((p) => !p)}
              className="rounded px-1 py-0.5 text-base leading-none transition-colors hover:bg-zinc-900"
              title="Reager"
            >
              😊
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full right-0 mb-1 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-800 p-1.5 shadow-2xl">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { onReact(message.id, e); setEmojiOpen(false); }}
                    className="rounded p-1 text-base transition-colors hover:bg-zinc-900"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            onClick={() => setReplying((p) => !p)}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900 hover:opacity-80"
            title="Svar i tråd"
          >
            <Reply className="h-4 w-4" />
          </button>

          {/* Edit (own) */}
          {isOwn && (
            <button
              onClick={() => { setEditing(true); setEditContent(message.content); }}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900 hover:opacity-80"
              title="Rediger"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          {/* Pin (admin/owner/mod) */}
          {canPin && (
            <button
              onClick={() => onPin(message.id, !message.isPinned)}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-amber-400"
              title={message.isPinned ? "Fjern festing" : "Fest melding"}
            >
              {message.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}

          {/* Delete (own or admin) */}
          {(isOwn || canPin) && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(message.id); setConfirmDelete(false); }}
                  className="rounded px-1.5 py-0.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                >
                  Slett
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1.5 py-0.5 text-xs text-zinc-400 transition-colors hover:opacity-80"
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-rose-400"
                title="Slett"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Inline reply input */}
      {replying && (
        <div className="ml-11 mr-2 mb-1 flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
          <input
            ref={replyRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitReply(); }
              if (e.key === "Escape") { setReplying(false); setReplyContent(""); }
            }}
            placeholder={`Svar til ${message.author.name ?? ""}…`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-400 outline-none"
          />
          <button onClick={submitReply} disabled={!replyContent.trim()}
            className="text-zinc-400 transition-colors hover:text-indigo-400 disabled:opacity-30">
            <Send className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setReplying(false); setReplyContent(""); }}
            className="text-xs text-zinc-400 opacity-60 hover:opacity-100">
            Avbryt
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Expanded replies */}
      {expanded && replies.length > 0 && (
        <div className="ml-11 mr-2 space-y-1 border-l-2 border-zinc-800 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2 py-1">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                {initials(reply.author.name ?? "")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-white">{reply.author.name}</span>
                  <span className="text-[10px] text-zinc-400">{formatTime(reply.createdAt)}</span>
                  {reply.editedAt && <span className="text-[10px] text-zinc-400 opacity-60">(redigert)</span>}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  <SafeHtml content={reply.content} />
                </div>
                {reply.reactions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {reply.reactions.map(({ emoji, count, reactedByMe }) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(reply.id, emoji)}
                        className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
                          reactedByMe
                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-indigo-500"
                        }`}
                      >
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
