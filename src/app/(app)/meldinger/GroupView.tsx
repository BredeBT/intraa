"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, Loader2, X, Paperclip, Trash2 } from "lucide-react";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id:        string;
  name:      string | null;
  avatarUrl: string | null;
}

interface GroupMsg {
  id:        string;
  content:   string;
  imageUrl:  string | null;
  createdAt: string;
  author:    { id: string; name: string | null; avatarUrl: string | null };
}

interface Props {
  groupId:       string;
  groupName:     string;
  createdBy:     string;
  currentUserId: string;
  members:       Member[];
  onDeleted:     () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ avatarUrl, name, size = 7 }: { avatarUrl: string | null; name: string | null; size?: number }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={`h-${size} w-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`h-${size} w-${size} flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupView({ groupId, groupName, createdBy, currentUserId, members, onDeleted }: Props) {
  const [messages,       setMessages]       = useState<GroupMsg[]>([]);
  const [sending,        setSending]        = useState(false);
  const [mentionQuery,   setMentionQuery]   = useState<string | null>(null);
  const [mentionIndex,   setMentionIndex]   = useState(0);
  const [pasteImageFile, setPasteImageFile] = useState<File | null>(null);
  const [pastePreview,   setPastePreview]   = useState<string | null>(null);
  const [pasteToast,     setPasteToast]     = useState<string | null>(null);
  const [isUploading,    setIsUploading]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const bottomRef       = useRef<HTMLDivElement>(null);
  const pasteToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef       = useRef<RichTextEditorRef>(null);

  const mentionSuggestions = mentionQuery !== null
    ? members.filter((m) => (m.name ?? "").toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  // Load messages
  useEffect(() => {
    setMessages([]);
    fetch(`/api/groups/${groupId}/messages`)
      .then((r) => r.json() as Promise<{ messages: GroupMsg[] }>)
      .then(({ messages: msgs }) => setMessages(msgs))
      .catch(() => null);
  }, [groupId]);

  // Realtime: receive messages broadcast by other group members
  const { broadcast } = useRealtimeChannel<GroupMsg>(`group:${groupId}`, (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Paste handler
  const showPasteToast = useCallback((msg: string) => {
    setPasteToast(msg);
    if (pasteToastTimer.current) clearTimeout(pasteToastTimer.current);
    pasteToastTimer.current = setTimeout(() => setPasteToast(null), 3000);
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const img = items.find((i) => i.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      const file = img.getAsFile();
      if (!file) return;
      setPasteImageFile(file);
      setPastePreview(URL.createObjectURL(file));
      showPasteToast("Bilde klar til sending");
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [showPasteToast]);

  // @mention handling
  function handleEditorChange(_text: string, textBeforeCursor: string) {
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else setMentionQuery(null);
  }

  function insertMention(name: string) {
    editorRef.current?.insertMention(name);
    setMentionQuery(null);
  }

  function handleMentionKey(e: React.KeyboardEvent) {
    if (mentionSuggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (mentionSuggestions[mentionIndex]) insertMention(mentionSuggestions[mentionIndex].name ?? "");
    } else if (e.key === "Escape") { setMentionQuery(null); }
  }

  // Upload
  async function uploadAndGetUrl(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "chat");
    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string };
      return data.url ?? null;
    } catch { return null; }
    finally { setIsUploading(false); }
  }

  // Send
  async function doSend() {
    const editorEmpty = editorRef.current?.isEmpty() ?? true;
    if ((editorEmpty && !pasteImageFile) || sending) return;
    setSending(true);

    let imageUrl: string | null = null;
    if (pasteImageFile) {
      imageUrl = await uploadAndGetUrl(pasteImageFile);
      setPasteImageFile(null);
      setPastePreview(null);
    }

    const html = editorRef.current?.getHTML() ?? "";
    editorRef.current?.clear();
    setMentionQuery(null);

    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: html || " ", imageUrl }),
    });
    if (res.ok) {
      const data = await res.json() as { message: GroupMsg };
      setMessages((prev) => [...prev, data.message]);
      void broadcast(data.message);
    }
    setSending(false);
  }

  // Delete group
  async function deleteGroup() {
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {members.slice(0, 3).map((m) => (
              <Avatar key={m.id} avatarUrl={m.avatarUrl} name={m.name} size={6} />
            ))}
          </div>
          <span className="text-sm font-semibold text-white">{groupName}</span>
          <span className="text-xs text-zinc-500">({members.length})</span>
        </div>
        {createdBy === currentUserId && (
          <div className="relative">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Slett gruppe?</span>
                <button onClick={deleteGroup} className="rounded px-2 py-1 text-xs bg-rose-600 text-white hover:bg-rose-500">Ja</button>
                <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600">Avbryt</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-zinc-600 hover:text-rose-400 transition-colors" title="Slett gruppe">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members row */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900/50 px-5 py-2 overflow-x-auto">
        {members.map((m) => (
          <span key={m.id} className="flex items-center gap-1 rounded-full bg-zinc-800 pl-1 pr-2.5 py-0.5 text-xs text-zinc-400 shrink-0">
            <Avatar avatarUrl={m.avatarUrl} name={m.name} size={4} />
            {m.name?.split(" ")[0]}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-600">Ingen meldinger ennå. Si hei!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.author.id === currentUserId;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && <Avatar avatarUrl={msg.author.avatarUrl} name={msg.author.name} size={6} />}
              <div className={`max-w-xs ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && <span className="mb-0.5 text-[10px] text-zinc-500">{msg.author.name}</span>}
                {msg.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={msg.imageUrl} alt="" className="max-h-48 w-auto rounded-xl border border-zinc-700 object-cover cursor-pointer" />
                ) : (
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-zinc-800 text-zinc-200"}`}>
                    <SafeHtml content={msg.content} />
                  </div>
                )}
                <p className={`mt-0.5 text-[10px] text-zinc-600 ${isMe ? "text-right" : ""}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Paste preview */}
      {pastePreview && (
        <div className="relative mx-5 mb-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pastePreview} alt="Bilde" className="h-20 w-auto rounded-lg border border-zinc-700 object-cover" />
          <button onClick={() => { setPasteImageFile(null); setPastePreview(null); }}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Paste toast */}
      {pasteToast && <div className="mx-5 mb-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">{pasteToast}</div>}

      {/* @mention dropdown */}
      {mentionSuggestions.length > 0 && (
        <div className="mx-5 mb-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl" onKeyDown={handleMentionKey}>
          {mentionSuggestions.map((m, i) => (
            <button key={m.id} onMouseDown={(e) => { e.preventDefault(); insertMention(m.name ?? ""); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left ${i === mentionIndex ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}>
              <Avatar avatarUrl={m.avatarUrl} name={m.name} size={5} />
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-5 py-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <RichTextEditor
              ref={editorRef}
              placeholder="Skriv en gruppemelding…"
              onChange={handleEditorChange}
              onEnter={() => void doSend()}
            />
            <label className="absolute bottom-2 right-3 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors">
              <Paperclip className="h-4 w-4" />
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPasteImageFile(file);
                setPastePreview(URL.createObjectURL(file));
                e.target.value = "";
              }} />
            </label>
          </div>
          <button
            onClick={() => void doSend()}
            disabled={sending || isUploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:opacity-80 disabled:opacity-30"
          >
            {sending || isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
