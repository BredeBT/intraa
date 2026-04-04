"use client";

import {
  useState, useRef, useEffect, useTransition, useCallback,
} from "react";
import { Send, Paperclip, Bell, BellOff, LogOut, Check, MoreHorizontal } from "lucide-react";
import { sendMessage, getMessages } from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import MessageItem, { type LocalMessage, type Attachment } from "./MessageItem";
import ThreadPanel, { type ThreadMsg } from "./ThreadPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Channel { id: string; name: string; }

interface Props {
  channels:        Channel[];
  initialMessages: MessageWithAuthor[];
  userId:          string;
  userName:        string;
}

interface DmContact {
  id:       string;
  name:     string;
  initials: string;
  online:   boolean;
}

// ─── Mock DM contacts ─────────────────────────────────────────────────────────

const DM_CONTACTS: DmContact[] = [
  { id: "dm-mh", name: "Maria Haugen", initials: "MH", online: true  },
  { id: "dm-tk", name: "Thomas Kvam",  initials: "TK", online: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatClient({ channels, initialMessages, userId, userName }: Props) {
  const firstChannelId = channels[0]?.id ?? "";

  // Core state
  const [activeId,   setActiveId]   = useState(firstChannelId);
  const [messages,   setMessages]   = useState<LocalMessage[]>(initialMessages);
  const [input,      setInput]      = useState("");
  const [isPending,  startTransition] = useTransition();

  // Reactions: messageId -> emoji -> count
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});

  // Threads: messageId -> replies
  const [threads,     setThreads]     = useState<Record<string, ThreadMsg[]>>({});
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);

  // Unread: channelId -> count (mock initial values)
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(channels.slice(1).map((c, i) => [c.id, i + 1]))
  );

  // Muted channels
  const [muted, setMuted] = useState<Set<string>>(new Set());

  // Left channels (hidden)
  const [leftChannels, setLeftChannels] = useState<Set<string>>(new Set());

  // Channel context menu
  const [ctxMenu, setCtxMenu] = useState<{ id: string } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // DM typing indicator
  const [typingDm, setTypingDm] = useState<string | null>(null);

  // File input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll anchor
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visibleChannels = channels.filter((c) => !leftChannels.has(c.id));
  const activeChannel   = visibleChannels.find((c) => c.id === activeId);
  const activeDm        = DM_CONTACTS.find((d) => d.id === activeId);
  const channelLabel    = activeChannel
    ? `#${activeChannel.name}`
    : activeDm?.name ?? "";

  const threadMsg = threadMsgId
    ? messages.find((m) => m.id === threadMsgId) ?? null
    : null;

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Simulate typing indicator for DMs
  useEffect(() => {
    if (!activeDm) { setTypingDm(null); return; }
    if (activeDm.online) {
      const t = setTimeout(() => setTypingDm(activeDm.name), 1200);
      const c = setTimeout(() => setTypingDm(null), 4000);
      return () => { clearTimeout(t); clearTimeout(c); };
    }
  }, [activeId, activeDm]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function switchChannel(id: string) {
    setCtxMenu(null);
    setActiveId(id);
    setMessages([]);
    setThreadMsgId(null);
    // Clear unread
    setUnread((p) => ({ ...p, [id]: 0 }));
    startTransition(async () => {
      const msgs = await getMessages(id);
      setMessages(msgs);
    });
  }

  function switchDm(id: string) {
    setActiveId(id);
    setMessages([]);
    setThreadMsgId(null);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !activeChannel) return;

    const optimistic: LocalMessage = {
      id:        `opt-${Date.now()}`,
      content:   text,
      createdAt: new Date(),
      channelId: activeId,
      authorId:  userId,
      author:    { id: userId, name: userName, email: "", avatarUrl: null, createdAt: new Date() },
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    startTransition(async () => {
      try {
        const saved = await sendMessage(activeId, text);
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      } catch {
        // Optimistic message stays on error
      }
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // Reactions
  const handleReact = useCallback((msgId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = prev[msgId] ?? {};
      const current = msgReactions[emoji] ?? 0;
      return {
        ...prev,
        [msgId]: { ...msgReactions, [emoji]: current > 0 ? current - 1 : current + 1 },
      };
    });
  }, []);

  // Delete message
  const handleDelete = useCallback((msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    if (threadMsgId === msgId) setThreadMsgId(null);
  }, [threadMsgId]);

  // Thread reply
  function addThreadReply(parentId: string, content: string) {
    const reply: ThreadMsg = {
      id:         `tr-${Date.now()}`,
      content,
      authorName: userName,
      createdAt:  new Date(),
    };
    setThreads((prev) => ({
      ...prev,
      [parentId]: [...(prev[parentId] ?? []), reply],
    }));
  }

  // File attachment
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeChannel) return;

    const url  = URL.createObjectURL(file);
    const type: Attachment["type"] = file.type.startsWith("image/") ? "image" : "file";

    const msg: LocalMessage = {
      id:        `opt-file-${Date.now()}`,
      content:   "",
      createdAt: new Date(),
      channelId: activeId,
      authorId:  userId,
      author:    { id: userId, name: userName, email: "", avatarUrl: null, createdAt: new Date() },
      attachment: { name: file.name, url, type, size: file.size },
    };

    setMessages((prev) => [...prev, msg]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Channel context menu actions
  function markRead(id: string) { setUnread((p) => ({ ...p, [id]: 0 })); setCtxMenu(null); }
  function toggleMute(id: string) {
    setMuted((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setCtxMenu(null);
  }
  function leaveChannel(id: string) {
    setLeftChannels((p) => new Set([...p, id]));
    setCtxMenu(null);
    if (activeId === id) {
      const next = visibleChannels.find((c) => c.id !== id);
      if (next) switchChannel(next.id);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">

      {/* ── Channel / DM sidebar ── */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 py-4">

        {/* Channels */}
        <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Kanaler
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {visibleChannels.map((ch) => {
            const count  = unread[ch.id] ?? 0;
            const isMute = muted.has(ch.id);
            const isCtx  = ctxMenu?.id === ch.id;

            return (
              <div key={ch.id} className="relative group/ch">
                <button
                  onClick={() => switchChannel(ch.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    activeId === ch.id
                      ? "bg-indigo-600 text-white"
                      : count > 0
                        ? "font-semibold text-white hover:bg-zinc-800"
                        : "font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span className="flex-1 truncate">
                    {isMute ? "🔇 " : "# "}{ch.name}
                  </span>
                  {count > 0 && activeId !== ch.id && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </button>

                {/* "..." context menu button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setCtxMenu(isCtx ? null : { id: ch.id }); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity group-hover/ch:opacity-100 hover:bg-zinc-700 hover:text-zinc-300"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                {/* Context menu */}
                {isCtx && (
                  <div
                    ref={ctxMenuRef}
                    className="absolute left-full top-0 z-50 ml-1 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
                  >
                    <button
                      onClick={() => markRead(ch.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      <Check className="h-4 w-4 text-zinc-500" /> Merk som lest
                    </button>
                    <button
                      onClick={() => toggleMute(ch.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      {isMute
                        ? <><Bell    className="h-4 w-4 text-zinc-500" /> Opphev lydløs</>
                        : <><BellOff className="h-4 w-4 text-zinc-500" /> Lydløs kanal</>}
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      onClick={() => leaveChannel(ch.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-zinc-800"
                    >
                      <LogOut className="h-4 w-4" /> Forlat kanal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* DMs */}
        <p className="mb-1 mt-5 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Direktemeldinger
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {DM_CONTACTS.map((dm) => (
            <button
              key={dm.id}
              onClick={() => switchDm(dm.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                activeId === dm.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {/* Avatar with online dot */}
              <div className="relative shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
                  {dm.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${
                    dm.online ? "bg-emerald-500" : "bg-zinc-600"
                  }`}
                />
              </div>
              <span className="truncate">{dm.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Message area ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-zinc-800 px-6 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{channelLabel}</p>
            {activeDm && (
              <span
                className={`h-2 w-2 rounded-full ${activeDm.online ? "bg-emerald-500" : "bg-zinc-600"}`}
              />
            )}
          </div>
          {activeDm && typingDm && (
            <p className="mt-0.5 text-xs text-zinc-500 italic">{typingDm} skriver…</p>
          )}
        </header>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-5">
          {isPending && messages.length === 0 && (
            <p className="text-sm text-zinc-600">Laster meldinger…</p>
          )}
          {messages.length === 0 && !isPending && (
            <p className="text-sm text-zinc-600">
              {activeChannel
                ? `Ingen meldinger i #${activeChannel.name} ennå.`
                : `Start samtalen med ${activeDm?.name ?? ""}.`}
            </p>
          )}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isOwn={msg.authorId === userId}
              reactions={reactions[msg.id] ?? {}}
              onReact={(e) => handleReact(msg.id, e)}
              onDelete={() => handleDelete(msg.id)}
              onReply={() => setThreadMsgId(msg.id === threadMsgId ? null : msg.id)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-2">
            {/* File attachment */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeChannel}
              className="shrink-0 text-zinc-500 transition-colors hover:text-indigo-400 disabled:opacity-30"
              title="Legg ved fil"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!activeChannel && !activeDm}
              placeholder={
                activeChannel
                  ? `Skriv til ${channelLabel}…`
                  : activeDm
                    ? `Melding til ${activeDm.name}…`
                    : "Velg en kanal…"
              }
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-40"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending || !activeChannel}
              className="shrink-0 text-zinc-500 transition-colors hover:text-indigo-400 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Thread panel ── */}
      {threadMsg && (
        <ThreadPanel
          parent={threadMsg}
          replies={threads[threadMsg.id] ?? []}
          userName={userName}
          onAddReply={(content) => addThreadReply(threadMsg.id, content)}
          onClose={() => setThreadMsgId(null)}
        />
      )}
    </div>
  );
}
