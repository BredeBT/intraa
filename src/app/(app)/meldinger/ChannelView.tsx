"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { SendHorizontal, Loader2, X, Paperclip } from "lucide-react";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditor";
import {
  sendMessage, getMessages, editMessage, deleteMessage, pinMessage,
} from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import MessageItem, { type LocalMessage } from "@/app/(app)/chat/MessageItem";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string | null }

interface Props {
  channelId:    string;
  channelName:  string;
  orgId:        string;
  userId:       string;
  userName:     string;
  userRole:     string;          // OWNER | ADMIN | MODERATOR | VIP | MEMBER
  members:      Member[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChannelView({ channelId, channelName, userId, userName, userRole, members }: Props) {
  const [messages,       setMessages]       = useState<LocalMessage[]>([]);
  const [isPending,      startTransition]   = useTransition();
  const [mentionQuery,   setMentionQuery]   = useState<string | null>(null);
  const [mentionIndex,   setMentionIndex]   = useState(0);
  const [pasteImageFile, setPasteImageFile] = useState<File | null>(null);
  const [pastePreview,   setPastePreview]   = useState<string | null>(null);
  const [pasteToast,     setPasteToast]     = useState<string | null>(null);
  const [isUploading,    setIsUploading]    = useState(false);
  const [uploadedUrl,    setUploadedUrl]    = useState<string | null>(null);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const isAtBottomRef  = useRef(true);
  const lastMsgIdRef   = useRef<string | undefined>(undefined);
  const pasteToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef      = useRef<RichTextEditorRef>(null);

  const canPin = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MODERATOR";
  const memberNames = members.map((m) => m.name ?? "").filter(Boolean);
  const mentionSuggestions = mentionQuery !== null
    ? members.filter((m) => (m.name ?? "").toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  // Load messages on mount and when channelId changes
  useEffect(() => {
    setMessages([]);
    editorRef.current?.clear();
    getMessages(channelId).then((msgs) => {
      setMessages(msgs as LocalMessage[]);
      lastMsgIdRef.current = msgs[msgs.length - 1]?.id;
    }).catch(() => null);
    // Mark channel as read
    fetch(`/api/channels/${channelId}/read`, { method: "PATCH" }).catch(() => null);
  }, [channelId]);

  // Realtime: receive messages broadcast by other users
  const { broadcast } = useRealtimeChannel<LocalMessage>(`channel:${channelId}`, (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      if (isAtBottomRef.current) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      return [...prev, msg];
    });
  });

  // Scroll tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Image paste ─────────────────────────────────────────────────────────────

  const showPasteToast = useCallback((msg: string) => {
    setPasteToast(msg);
    if (pasteToastTimer.current) clearTimeout(pasteToastTimer.current);
    pasteToastTimer.current = setTimeout(() => setPasteToast(null), 3000);
  }, []);

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const img = items.find((i) => i.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      const file = img.getAsFile();
      if (!file) return;
      setPastePreview(URL.createObjectURL(file));
      setPasteImageFile(file);
      setIsUploading(true);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json() as { url?: string };
        if (data.url) {
          setPastePreview(data.url);
          setUploadedUrl(data.url);
          showPasteToast("Bilde klar til sending");
        } else {
          setPastePreview(null);
          setPasteImageFile(null);
          showPasteToast("Opplasting feilet");
        }
      } catch {
        setPastePreview(null);
        setPasteImageFile(null);
        showPasteToast("Opplasting feilet");
      } finally {
        setIsUploading(false);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPasteToast]);

  // ── @mention handling ────────────────────────────────────────────────────────

  function handleEditorChange(_text: string, textBeforeCursor: string) {
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else setMentionQuery(null);
  }

  function insertMention(name: string) {
    editorRef.current?.insertMention(name);
    setMentionQuery(null);
  }

  // ── Send ─────────────────────────────────────────────────────────────────────

  async function uploadFile(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string };
      return data.url ?? null;
    } catch { return null; }
    finally { setIsUploading(false); }
  }

  async function doSend() {
    const editorEmpty = editorRef.current?.isEmpty() ?? true;
    if ((editorEmpty && !uploadedUrl) || isPending) return;

    const imageUrl = uploadedUrl ?? undefined;
    setPasteImageFile(null);
    setPastePreview(null);
    setUploadedUrl(null);

    const html = editorRef.current?.getHTML() ?? "";
    editorRef.current?.clear();
    setMentionQuery(null);

    startTransition(async () => {
      try {
        const msg = await sendMessage(channelId, html || " ", undefined, imageUrl);
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(msg.id)) return prev;
          return [...prev, msg as LocalMessage];
        });
        lastMsgIdRef.current = msg.id;
        isAtBottomRef.current = true;
        void broadcast(msg as LocalMessage);
      } catch { /* ignore */ }
    });
  }

  // ── Message handlers ─────────────────────────────────────────────────────────

  function handleReact(msgId: string, emoji: string) {
    import("@/server/actions/messages").then(({ toggleReaction }) => {
      void toggleReaction(msgId, emoji);
      setMessages((prev) => prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        const reactions = existing
          ? m.reactions.map((r) => r.emoji === emoji
              ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe }
              : r
            ).filter((r) => r.count > 0)
          : [...m.reactions, { emoji, count: 1, reactedByMe: true }];
        return { ...m, reactions };
      }));
    });
  }

  function handleEdit(msgId: string, newContent: string) {
    startTransition(async () => {
      const updated = await editMessage(msgId, newContent);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, ...updated } : m));
    });
  }

  function handleDelete(msgId: string) {
    startTransition(async () => {
      await deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    });
  }

  function handleReply(parentId: string, content: string) {
    startTransition(async () => {
      const msg = await sendMessage(channelId, content, parentId);
      setMessages((prev) => prev.map((m) => {
        if (m.id !== parentId) return m;
        return { ...m, replies: [...(m.replies ?? []), msg], replyCount: (m.replyCount ?? 0) + 1 };
      }));
    });
  }

  function handlePin(msgId: string, isPinned: boolean) {
    startTransition(async () => {
      await pinMessage(msgId, isPinned);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isPinned } : m));
    });
  }

  const dmContacts = members.map((m) => ({ id: m.id, name: m.name ?? "" }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-5 py-3">
        <span className="text-sm text-zinc-500">#</span>
        <span className="text-sm font-semibold text-white">{channelName}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-950 px-2 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-600">Ingen meldinger ennå. Si noe!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.authorId === userId}
            canPin={canPin}
            userId={userId}
            dmContacts={dmContacts}
            memberNames={memberNames}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            onPin={handlePin}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Paste preview */}
      {pastePreview && (
        <div className="relative mx-5 mb-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pastePreview} alt="Bilde" className="h-20 w-auto rounded-lg border border-zinc-700 object-cover" />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={() => { setPasteImageFile(null); setPastePreview(null); setUploadedUrl(null); }}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Paste toast */}
      {pasteToast && (
        <div className="mx-5 mb-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">{pasteToast}</div>
      )}

      {/* @mention dropdown */}
      {mentionSuggestions.length > 0 && (
        <div className="mx-5 mb-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
          {mentionSuggestions.map((m, i) => (
            <button
              key={m.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m.name ?? ""); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left ${i === mentionIndex ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-bold text-white">
                {(m.name ?? "?").charAt(0).toUpperCase()}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-5 py-3">
        <div className="flex items-end gap-2">
          <label className="shrink-0 cursor-pointer p-2 text-white/50 transition-colors hover:text-white" title="Last opp bilde (eller lim inn med Ctrl+V)">
            <Paperclip className="h-4 w-4" />
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              setPastePreview(URL.createObjectURL(file));
              setPasteImageFile(file);
              const url = await uploadFile(file);
              if (url) {
                setPastePreview(url);
                setUploadedUrl(url);
              } else {
                setPastePreview(null);
                setPasteImageFile(null);
                showPasteToast("Opplasting feilet");
              }
            }} />
          </label>
          <div className="flex-1">
            <RichTextEditor
              ref={editorRef}
              placeholder={`Skriv i #${channelName}…`}
              onChange={handleEditorChange}
              onEnter={() => void doSend()}
              onSendWithImage={async (imageUrl) => {
                startTransition(async () => {
                  try {
                    const msg = await sendMessage(channelId, " ", undefined, imageUrl);
                    setMessages((prev) => {
                      const ids = new Set(prev.map((m) => m.id));
                      if (ids.has(msg.id)) return prev;
                      return [...prev, msg as LocalMessage];
                    });
                    isAtBottomRef.current = true;
                    void broadcast(msg as LocalMessage);
                  } catch { /* silent */ }
                });
              }}
            />
          </div>
          <button
            onClick={() => void doSend()}
            disabled={isPending || isUploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:opacity-80 disabled:opacity-30"
          >
            {isPending || isUploading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <SendHorizontal className="h-4 w-4" />
            }
          </button>
        </div>
        {userName && (
          <p className="mt-1 text-[10px] text-zinc-600">Enter for å sende · Shift+Enter for ny linje · @ for å nevne · **fet** _kursiv_</p>
        )}
      </div>
    </div>
  );
}
