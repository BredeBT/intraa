"use client";

import {
  useState, useRef, useEffect, useTransition, useCallback,
} from "react";
import {
  SendHorizontal, Paperclip, Bell, BellOff, LogOut,
  Check, MoreHorizontal, Pin, X, Loader2, Settings, Search,
  Pencil, Trash2, Plus,
} from "lucide-react";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditor";
import {
  sendMessage, getMessages, getOrCreateDmChannel,
  editMessage, deleteMessage, pinMessage,
} from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import MessageItem, { type LocalMessage, type Attachment } from "./MessageItem";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { broadcastMessage } from "@/lib/broadcast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Channel    { id: string; name: string; type: string; }
interface DmContact  { id: string; name: string; initials: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Props {
  orgId:           string; // kept for future use (e.g. optimistic updates)
  channels:        Channel[];
  initialMessages: MessageWithAuthor[];
  dmContacts:      DmContact[];
  userId:          string;
  userName:        string;
  userRole:        string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatClient({
  orgId: _orgId, channels: initialChannels, initialMessages, dmContacts, userId, userName, userRole,
}: Props) {
  const [localChannels, setLocalChannels] = useState(initialChannels);
  const firstChannelId = localChannels[0]?.id ?? "";

  const [activeId,         setActiveId]         = useState(firstChannelId);
  const [messages,         setMessages]         = useState<LocalMessage[]>(initialMessages);

  // Channel management modal
  const [showChanModal,    setShowChanModal]    = useState(false);
  const [editingChanId,    setEditingChanId]    = useState<string | null>(null);
  const [editChanName,     setEditChanName]     = useState("");
  const [editChanType,     setEditChanType]     = useState("TEXT");
  const [newChanName,      setNewChanName]      = useState("");
  const [newChanType,      setNewChanType]      = useState("TEXT");
  const [chanModalBusy,    setChanModalBusy]    = useState(false);
  const [chanModalErr,     setChanModalErr]     = useState("");
  const [confirmDelChanId, setConfirmDelChanId] = useState<string | null>(null);

  // DM search
  const [dmSearch,         setDmSearch]         = useState("");
  const [isPending,        startTransition]     = useTransition();
  const [unread,           setUnread]           = useState<Record<string, number>>({});
  const [muted,            setMuted]            = useState<Set<string>>(new Set());
  const [leftChannels,     setLeftChannels]     = useState<Set<string>>(new Set());
  const [ctxMenu,          setCtxMenu]          = useState<{ id: string } | null>(null);
  const [resolvedChannelId, setResolvedChannelId] = useState(firstChannelId);
  const [pinnedMessages,   setPinnedMessages]   = useState<MessageWithAuthor[]>([]);
  const [showPinned,       setShowPinned]       = useState(false);

  // @mention dropdown
  const [mentionQuery,     setMentionQuery]     = useState<string | null>(null);
  const [mentionIndex,     setMentionIndex]     = useState(0);

  // Image paste state
  const [pasteImageFile,   setPasteImageFile]   = useState<File | null>(null);
  const [pastePreview,     setPastePreview]     = useState<string | null>(null);
  const [pasteToast,       setPasteToast]       = useState<string | null>(null);
  const [isUploading,      setIsUploading]      = useState(false);
  const pasteToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctxMenuRef    = useRef<HTMLDivElement>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastMsgIdRef  = useRef<string | undefined>(undefined);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const editorRef     = useRef<RichTextEditorRef>(null);

  const canPin = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MODERATOR";

  // All members for @mention dropdown (self + dm contacts combined)
  const allMembers = [{ id: userId, name: userName }, ...dmContacts.map((d) => ({ id: d.id, name: d.name }))];
  const memberNames = allMembers.map((m) => m.name);

  // Filtered mention suggestions
  const mentionSuggestions = mentionQuery !== null
    ? allMembers.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";
  const visibleChannels = localChannels.filter((c) => !leftChannels.has(c.id));
  const activeChannel   = visibleChannels.find((c) => c.id === activeId);
  const isAnnouncementChannel = activeChannel?.type === "ANNOUNCEMENT";
  const filteredDmContacts = dmSearch
    ? dmContacts.filter((d) => d.name.toLowerCase().includes(dmSearch.toLowerCase()))
    : dmContacts;
  const activeDm        = dmContacts.find((d) => d.id === activeId);
  const channelLabel    = activeChannel ? `#${activeChannel.name}` : activeDm?.name ?? "";

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function scrollToBottom() { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { lastMsgIdRef.current = messages[messages.length - 1]?.id; }, [messages]);

  // Realtime: receive messages from other users on the active channel
  useRealtimeChannel(
    resolvedChannelId ? `channel:${resolvedChannelId}` : "__none__",
    (payload) => {
      if (!resolvedChannelId) return;
      const msg = (payload as { payload?: LocalMessage }).payload;
      if (!msg) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (isAtBottomRef.current) setTimeout(scrollToBottom, 50);
        return [...prev, msg];
      });
    },
  );

  // Fetch pinned messages when channel changes
  useEffect(() => {
    if (!resolvedChannelId) return;
    fetch(`/api/channels/${resolvedChannelId}/pins`)
      .then((r) => r.ok ? r.json() as Promise<MessageWithAuthor[]> : Promise.resolve([]))
      .then(setPinnedMessages)
      .catch(() => setPinnedMessages([]));
  }, [resolvedChannelId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) setCtxMenu(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Paste image from clipboard
  const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          if (!ALLOWED.includes(item.type)) {
            showToast("Kun PNG, JPEG, GIF og WebP støttes");
            return;
          }
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => setPastePreview(ev.target?.result as string);
          reader.readAsDataURL(file);
          setPasteImageFile(file);
          showToast("Bilde klar til sending – trykk Enter eller Send");
          return;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setPasteToast(msg);
    if (pasteToastTimer.current) clearTimeout(pasteToastTimer.current);
    pasteToastTimer.current = setTimeout(() => setPasteToast(null), 3500);
  }

  function clearPasteImage() {
    setPasteImageFile(null);
    setPastePreview(null);
    setPasteToast(null);
  }

  // ── Input / Mention handling ─────────────────────────────────────────────────

  function handleEditorChange(_text: string, textBeforeCursor: string) {
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else setMentionQuery(null);
  }

  function insertMention(name: string) {
    editorRef.current?.insertMention(name);
    setMentionQuery(null);
  }

  // ── Channel actions ──────────────────────────────────────────────────────────

  function switchChannel(id: string) {
    setCtxMenu(null);
    setActiveId(id);
    setResolvedChannelId(id);
    setMessages([]);
    setShowPinned(false);
    clearPasteImage();
    setUnread((p) => ({ ...p, [id]: 0 }));
    fetch(`/api/channels/${id}/read`, { method: "PATCH" }).catch(() => null);
    startTransition(async () => {
      const msgs = await getMessages(id);
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    });
  }

  function switchDm(id: string) {
    setActiveId(id);
    setMessages([]);
    setShowPinned(false);
    clearPasteImage();
    startTransition(async () => {
      const chId = await getOrCreateDmChannel(id);
      setResolvedChannelId(chId);
      const msgs = await getMessages(chId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    });
  }

  // ── Send ─────────────────────────────────────────────────────────────────────

  function handleSend() {
    const editorEmpty = editorRef.current?.isEmpty() ?? true;
    if ((editorEmpty && !pasteImageFile) || !resolvedChannelId) return;
    const html = editorRef.current?.getHTML() ?? "";
    const imageFile = pasteImageFile;
    editorRef.current?.clear();
    setMentionQuery(null);
    clearPasteImage();

    startTransition(async () => {
      try {
        let imageUrl: string | undefined;
        if (imageFile) {
          setIsUploading(true);
          try {
            const form = new FormData();
            form.append("file", imageFile);
            const res = await fetch("/api/upload", { method: "POST", body: form });
            if (res.ok) {
              const data = await res.json() as { url: string };
              imageUrl = data.url;
            } else {
              setIsUploading(false);
              return;
            }
          } catch {
            setIsUploading(false);
            return;
          } finally {
            setIsUploading(false);
          }
        }
        const newMsg = await sendMessage(resolvedChannelId, html || " ", undefined, imageUrl);
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return ids.has(newMsg.id) ? prev : [...prev, newMsg as LocalMessage];
        });
        setTimeout(scrollToBottom, 50);
        // Broadcast to other subscribers
        void broadcastMessage(`channel:${resolvedChannelId}`, newMsg);
      } catch { /* silent */ }
    });
  }

  // ── Message actions ──────────────────────────────────────────────────────────

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find((r) => r.emoji === emoji);
      let newReactions = m.reactions.filter((r) => r.emoji !== emoji);
      if (!existing) {
        newReactions = [...newReactions, { emoji, count: 1, reactedByMe: true }];
      } else if (existing.reactedByMe) {
        if (existing.count > 1) newReactions = [...newReactions, { ...existing, count: existing.count - 1, reactedByMe: false }];
      } else {
        newReactions = [...newReactions, { ...existing, count: existing.count + 1, reactedByMe: true }];
      }
      return { ...m, reactions: newReactions };
    }));
    try {
      await fetch(`/api/messages/${msgId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch { /* silent */ }
  }, []);

  const handleEdit = useCallback(async (msgId: string, newContent: string) => {
    try {
      const updated = await editMessage(msgId, newContent);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, ...updated } : m));
    } catch { /* silent */ }
  }, []);

  const handleDelete = useCallback(async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await deleteMessage(msgId);
    } catch { /* silent */ }
  }, []);

  const handleReply = useCallback(async (parentId: string, content: string) => {
    try {
      await sendMessage(resolvedChannelId, content, parentId);
      // Refresh messages to get updated reply count + inline reply
      const msgs = await getMessages(resolvedChannelId);
      setMessages(msgs);
    } catch { /* silent */ }
  }, [resolvedChannelId]);

  const handlePin = useCallback(async (msgId: string, isPinned: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isPinned } : m));
    try {
      await pinMessage(msgId, isPinned);
      // Refresh pinned list
      const pins = await fetch(`/api/channels/${resolvedChannelId}/pins`).then((r) => r.json() as Promise<MessageWithAuthor[]>);
      setPinnedMessages(pins);
    } catch { /* silent */ }
  }, [resolvedChannelId]);

  // ── Channel context menu ──────────────────────────────────────────────────────

  function markRead(id: string)    { setUnread((p) => ({ ...p, [id]: 0 })); setCtxMenu(null); }
  function toggleMute(id: string)  {
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

  // ── Channel management ─────────────────────────────────────────────────────────

  async function createChannel() {
    if (!newChanName.trim() || chanModalBusy) return;
    setChanModalBusy(true); setChanModalErr("");
    const res = await fetch("/api/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChanName.trim(), type: newChanType }),
    });
    const data = await res.json() as { id?: string; name?: string; type?: string; error?: string };
    if (res.ok && data.id) {
      setLocalChannels((p) => [...p, { id: data.id!, name: data.name!, type: data.type! }]);
      setNewChanName(""); setNewChanType("TEXT");
    } else {
      setChanModalErr(data.error ?? "Noe gikk galt");
    }
    setChanModalBusy(false);
  }

  async function saveEditChannel() {
    if (!editingChanId || !editChanName.trim() || chanModalBusy) return;
    setChanModalBusy(true); setChanModalErr("");
    const res = await fetch(`/api/channels/${editingChanId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editChanName.trim(), type: editChanType }),
    });
    const data = await res.json() as { id?: string; name?: string; type?: string; error?: string };
    if (res.ok && data.id) {
      setLocalChannels((p) => p.map((c) => c.id === data.id ? { ...c, name: data.name!, type: data.type! } : c));
      setEditingChanId(null);
    } else {
      setChanModalErr(data.error ?? "Noe gikk galt");
    }
    setChanModalBusy(false);
  }

  async function deleteChannel(id: string) {
    setChanModalBusy(true); setChanModalErr("");
    const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
    const data = await res.json() as { error?: string };
    if (res.ok) {
      setLocalChannels((p) => p.filter((c) => c.id !== id));
      setConfirmDelChanId(null);
      if (activeId === id) {
        const next = localChannels.find((c) => c.id !== id);
        if (next) switchChannel(next.id);
      }
    } else {
      setChanModalErr(data.error ?? "Noe gikk galt");
    }
    setChanModalBusy(false);
  }

  // File attachment
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeChannel) return;
    const url = URL.createObjectURL(file);
    const type: Attachment["type"] = file.type.startsWith("image/") ? "image" : "file";
    const msg: LocalMessage = {
      id: `opt-file-${Date.now()}`,
      content: "",
      imageUrl: null,
      createdAt: new Date(),
      editedAt: null,
      isPinned: false,
      channelId: activeId,
      authorId: userId,
      parentMessageId: null,
      author: { id: userId, name: userName, email: "", avatarUrl: null, createdAt: new Date() },
      reactions: [],
      replyCount: 0,
      replies: [],
      attachment: { name: file.name, url, type, size: file.size },
    };
    setMessages((prev) => [...prev, msg]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">

      {/* Channel / DM sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-800 py-4">
        <div className="mb-1 flex items-center justify-between px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Kanaler</p>
          {isAdmin && (
            <button
              onClick={() => { setShowChanModal(true); setChanModalErr(""); setEditingChanId(null); }}
              className="rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
              title="Administrer kanaler"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {visibleChannels.map((ch) => {
            const count  = unread[ch.id] ?? 0;
            const isMute = muted.has(ch.id);
            const isCtx  = ctxMenu?.id === ch.id;
            return (
              <div key={ch.id} className="relative group/ch">
                <button
                  onClick={() => switchChannel(ch.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:opacity-80 ${activeId === ch.id ? "bg-indigo-600 text-white" : count > 0 ? "font-semibold text-white" : "text-zinc-400"}`}
                >
                  <span className="flex-1 truncate">{isMute ? "🔇 " : ch.type === "ANNOUNCEMENT" ? "📢 " : "# "}{ch.name}</span>
                  {count > 0 && activeId !== ch.id && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{count}</span>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCtxMenu(isCtx ? null : { id: ch.id }); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 opacity-0 transition-opacity group-hover/ch:opacity-100 hover:opacity-80"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {isCtx && (
                  <div ref={ctxMenuRef} className="absolute left-full top-0 z-50 ml-1 w-44 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                    <button onClick={() => markRead(ch.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:opacity-80">
                      <Check className="h-4 w-4" /> Merk som lest
                    </button>
                    <button onClick={() => toggleMute(ch.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:opacity-80">
                      {isMute ? <><Bell className="h-4 w-4" /> Opphev lydløs</> : <><BellOff className="h-4 w-4" /> Lydløs</>}
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                    <button onClick={() => leaveChannel(ch.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:opacity-80">
                      <LogOut className="h-4 w-4" /> Forlat kanal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <p className="mb-1 mt-5 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Direktemeldinger</p>
        <div className="mx-2 mb-1 flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
          <Search className="h-3 w-3 shrink-0 text-zinc-500" />
          <input
            value={dmSearch}
            onChange={(e) => setDmSearch(e.target.value)}
            placeholder="Finn medlem…"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
          />
          {dmSearch && (
            <button onClick={() => setDmSearch("")} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {filteredDmContacts.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-zinc-400 opacity-50">
              {dmSearch ? "Ingen treff." : "Ingen andre medlemmer ennå."}
            </p>
          )}
          {filteredDmContacts.map((dm) => (
            <button key={dm.id} onClick={() => switchDm(dm.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors hover:opacity-80 ${activeId === dm.id ? "bg-indigo-600 text-white" : "text-zinc-400"}`}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">{dm.initials}</div>
              <span className="truncate">{dm.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Message area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="border-b border-zinc-800 px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{channelLabel}</p>
            {pinnedMessages.length > 0 && (
              <button
                onClick={() => setShowPinned((p) => !p)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-amber-400 transition-colors hover:opacity-80"
              >
                <Pin className="h-3.5 w-3.5" />
                {pinnedMessages.length} festede meldinger
              </button>
            )}
          </div>
        </header>

        {/* Pinned messages panel */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="border-b border-zinc-800 bg-amber-500/5 px-6 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-400">📌 Festede meldinger</p>
              <button onClick={() => setShowPinned(false)} className="text-zinc-400 opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-2">
              {pinnedMessages.map((pm) => (
                <div key={pm.id} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-zinc-400">{pm.author.name}:</span>
                  <span className="text-xs text-zinc-400 opacity-70 line-clamp-1">{pm.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-6 py-5">
          {isPending && messages.length === 0 && <p className="text-sm text-zinc-400">Laster meldinger…</p>}
          {messages.length === 0 && !isPending && (
            <p className="text-sm text-zinc-400">
              {activeChannel ? `Ingen meldinger i #${activeChannel.name} ennå.` : `Start samtalen med ${activeDm?.name ?? ""}.`}
            </p>
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

        {/* Input */}
        <div className="relative border-t border-zinc-800 px-6 py-4">
          {/* Paste toast */}
          {pasteToast && (
            <div className="absolute -top-10 left-6 right-6 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 shadow-lg">
              <span>📋 {pasteToast}</span>
              <button onClick={() => setPasteToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          )}

          {/* Paste image preview */}
          {pastePreview && (
            <div className="mb-3 flex items-start gap-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pastePreview} alt="Forhåndsvisning" className="max-h-32 max-w-xs rounded-lg object-cover ring-1 ring-zinc-700" />
                <button
                  onClick={clearPasteImage}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* @mention dropdown */}
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-6 right-6 mb-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
              {mentionSuggestions.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => insertMention(m.name)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:opacity-80 ${i === mentionIndex ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white">
                    {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={!activeChannel}
              className="shrink-0 pb-2 text-zinc-400 transition-colors hover:text-indigo-400 disabled:opacity-30" title="Legg ved fil">
              <Paperclip className="h-4 w-4" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <RichTextEditor
              ref={editorRef}
              placeholder={
                isAnnouncementChannel && !isAdmin ? "Kun admin kan skrive i kunngjøringskanaler"
                : pasteImageFile ? "Legg til en bildetekst (valgfritt)…"
                : activeChannel ? `Skriv til ${channelLabel}…`
                : activeDm ? `Melding til ${activeDm.name}…`
                : "Velg en kanal…"
              }
              disabled={(!activeChannel && !activeDm) || (isAnnouncementChannel && !isAdmin)}
              onChange={handleEditorChange}
              onEnter={handleSend}
              className="flex-1"
            />
            <button onClick={handleSend}
              disabled={isPending || isUploading || (!activeChannel && !activeDm) || (isAnnouncementChannel && !isAdmin)}
              className="shrink-0 rounded-md bg-indigo-600 p-1.5 pb-2 text-white transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Channel management modal ─────────────────────────────────────── */}
      {showChanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Administrer kanaler</h2>
              <button onClick={() => setShowChanModal(false)} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            {chanModalErr && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{chanModalErr}</p>}

            {/* Existing channels */}
            <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "40vh" }}>
              {localChannels.map((ch) => (
                <div key={ch.id} className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                  {editingChanId === ch.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={editChanName}
                        onChange={(e) => setEditChanName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void saveEditChannel(); if (e.key === "Escape") setEditingChanId(null); }}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <select
                        value={editChanType}
                        onChange={(e) => setEditChanType(e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none"
                      >
                        <option value="TEXT">Tekst</option>
                        <option value="ANNOUNCEMENT">Kunngjøring</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => void saveEditChannel()} disabled={chanModalBusy}
                          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                          Lagre
                        </button>
                        <button onClick={() => setEditingChanId(null)} className="text-xs text-zinc-400 hover:text-white">Avbryt</button>
                      </div>
                    </div>
                  ) : confirmDelChanId === ch.id ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-zinc-300">Slette <span className="font-semibold">#{ch.name}</span> og alle meldinger?</p>
                      <div className="flex gap-2">
                        <button onClick={() => void deleteChannel(ch.id)} disabled={chanModalBusy}
                          className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                          Slett
                        </button>
                        <button onClick={() => setConfirmDelChanId(null)} className="text-xs text-zinc-400 hover:text-white">Avbryt</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-zinc-300">
                        {ch.type === "ANNOUNCEMENT" ? "📢" : "#"} {ch.name}
                      </span>
                      {ch.type === "ANNOUNCEMENT" && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">Kunngjøring</span>
                      )}
                      <button
                        onClick={() => { setEditingChanId(ch.id); setEditChanName(ch.name); setEditChanType(ch.type); setChanModalErr(""); }}
                        className="rounded p-1 text-zinc-500 hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setConfirmDelChanId(ch.id); setChanModalErr(""); }}
                        disabled={localChannels.length <= 1}
                        className="rounded p-1 text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={localChannels.length <= 1 ? "Kan ikke slette siste kanal" : "Slett kanal"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Create new channel */}
            <div className="border-t border-zinc-800 pt-4">
              <p className="mb-2 text-xs font-semibold text-zinc-400">Ny kanal</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">#</span>
                  <input
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void createChannel(); }}
                    placeholder="kanal-navn"
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-zinc-500"
                  />
                </div>
                <select
                  value={newChanType}
                  onChange={(e) => setNewChanType(e.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none"
                >
                  <option value="TEXT">Tekst</option>
                  <option value="ANNOUNCEMENT">Kunngjøring (kun admin kan skrive)</option>
                </select>
                <button
                  onClick={() => void createChannel()}
                  disabled={!newChanName.trim() || chanModalBusy}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Opprett kanal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
