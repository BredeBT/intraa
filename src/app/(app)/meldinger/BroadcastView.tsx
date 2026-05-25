"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { Send, Mic, Image as ImageIcon, Loader2, Heart, MessageCircle, Pin, Sparkles, ChevronUp, MoreHorizontal, Pencil, Trash2, X, Check, Type, Camera, Crown, Eye } from "lucide-react";
import { getMessages, sendMessage, toggleReaction, editMessage, deleteMessage } from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import VoiceMessage from "@/components/VoiceMessage";
import VoiceRecorder from "@/components/VoiceRecorder";
import { FanpassBadge } from "@/components/FanpassBadge";
import SafeHtml from "@/components/SafeHtml";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditorLazy";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import StoryStrip from "./StoryStrip";
import StoryCapture from "./StoryCapture";
import StoryViewer from "./StoryViewer";

interface StoryItem {
  id:         string;
  imageUrl:   string;
  caption:    string | null;
  width:      number | null;
  height:     number | null;
  createdAt:  string;
  expiresAt:  string;
  viewedByMe: boolean;
  sponsor:    { slug: string; brandName: string; logoUrl: string | null } | null;
}
interface StoryGroup {
  author:  { id: string; name: string | null; avatarUrl: string | null };
  stories: StoryItem[];
}

interface Props {
  channelId:    string;
  channelName:  string;
  orgId:        string;
  orgName:      string;
  userId:       string;
  userName:     string;
  userRole:     string;
}

const QUICK_REACTIONS = ["❤️", "🔥", "👀", "🎉", "😮", "🙌"] as const;

function fmt(date: Date) {
  const d  = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHr = Math.floor(diffMs / 3_600_000);
  if (diffHr < 1)  return "akkurat nå";
  if (diffHr < 24) return `for ${diffHr} ${diffHr === 1 ? "time" : "timer"} siden`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7)  return `for ${diffDays} ${diffDays === 1 ? "dag" : "dager"} siden`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function BroadcastView({
  channelId, channelName, orgName, userId, userName, userRole,
}: Props) {
  const [messages,    setMessages]    = useState<MessageWithAuthor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [recording,   setRecording]   = useState(false);
  const [isPending,   startTransition] = useTransition();
  const editorRef = useRef<RichTextEditorRef>(null);

  // Stories state
  const [storyGroups,    setStoryGroups]    = useState<StoryGroup[]>([]);
  const [storyCaptureOn, setStoryCaptureOn] = useState(false);
  const [storyViewerIdx, setStoryViewerIdx] = useState<number | null>(null);

  const isCreator = userRole === "OWNER" || userRole === "ADMIN";

  // Fetch stories
  const refetchStories = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/stories`);
      if (!res.ok) return;
      const data = await res.json() as { groups: StoryGroup[] };
      setStoryGroups(data.groups);
    } catch { /* silent */ }
  }, [channelId]);

  useEffect(() => { void refetchStories(); }, [refetchStories]);

  // Fetch
  useEffect(() => {
    let cancelled = false;
    void getMessages(channelId).then((msgs) => {
      if (!cancelled) {
        // Reverse — newest first for feed-style display
        setMessages([...msgs].reverse());
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [channelId]);

  // Realtime
  const { broadcast } = useRealtimeChannel<MessageWithAuthor>(`channel:${channelId}`, (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [msg, ...prev];
    });
  });

  // Focus editor når compose åpnes
  useEffect(() => {
    if (composeOpen) {
      // Liten delay så TipTap-editoren rekker å mounte før vi fokuserer
      setTimeout(() => editorRef.current?.focus(), 50);
    }
  }, [composeOpen]);

  async function postBroadcast(content: string, audioUrl?: string, audioDuration?: number, imageUrl?: string) {
    // For tekst-broadcasts er content HTML fra RichTextEditor — sjekk om
    // editoren er tom (bare <p></p>) før vi sender.
    const isHtmlEmpty = /^\s*(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)*$/i.test(content);
    if ((!content.trim() || isHtmlEmpty) && !audioUrl && !imageUrl) return;
    startTransition(async () => {
      try {
        const msg = await sendMessage(channelId, content || " ", undefined, imageUrl, audioUrl, audioDuration);
        setMessages((prev) => [msg, ...prev]);
        void broadcast(msg);
        setComposeText("");
        editorRef.current?.clear();
        setComposeOpen(false);
      } catch (err) {
        console.warn("[broadcast] post failed:", err);
      }
    });
  }

  async function handleEdit(messageId: string, newContent: string) {
    try {
      const updated = await editMessage(messageId, newContent);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m)));
    } catch (err) {
      console.warn("[broadcast] edit failed:", err);
    }
  }

  async function handleDelete(messageId: string) {
    // Optimistic remove
    const prev = messages;
    setMessages((p) => p.filter((m) => m.id !== messageId));
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.warn("[broadcast] delete failed:", err);
      setMessages(prev); // revert
    }
  }

  async function react(messageId: string, emoji: string) {
    // Optimistic
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const existing = m.reactions.find((r) => r.emoji === emoji);
      if (existing) {
        return {
          ...m,
          reactions: existing.reactedByMe
            ? m.reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r).filter((r) => r.count > 0)
            : m.reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r),
        };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reactedByMe: true }] };
    }));
    try { await toggleReaction(messageId, emoji); }
    catch { /* revert silently on error — rare */ }
  }

  const pinned = messages.filter((m) => m.isPinned && !m.parentMessageId);
  const regular = messages.filter((m) => !m.isPinned && !m.parentMessageId);

  function canDeleteStory(authorId: string) {
    return authorId === userId || isCreator;
  }

  function handleStoryDeleted(storyId: string) {
    setStoryGroups((prev) =>
      prev
        .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== storyId) }))
        .filter((g) => g.stories.length > 0),
    );
  }

  function handleStoryViewed(storyId: string) {
    setStoryGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === storyId ? { ...s, viewedByMe: true } : s)),
      })),
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── Aurora hero header ─────────────────────────────────────────────── */}
      <div
        className="relative shrink-0 px-6 py-6 border-b border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.08) 0%, rgba(168,85,247,0.10) 50%, rgba(96,165,250,0.08) 100%)" }}
      >
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-40 blur-[60px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-30 blur-[50px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #5EEAD4, transparent 70%)" }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              color:      "#FFFFFF",
              boxShadow:  "0 8px 24px rgba(168,85,247,0.4)",
            }}
          >
            ♛
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#5EEAD4" }}>
                Fanpass-broadcast
              </p>
            </div>
            <h1 className="text-xl font-bold text-white">#{channelName}</h1>
            <p className="text-xs text-white/50 mt-1">
              {orgName} · {messages.length} {messages.length === 1 ? "post" : "poster"}
              {regular.length > 0 && (
                <> · Sist {fmt(regular[0]!.createdAt)}</>
              )}
            </p>
          </div>
        </div>

        {/* Creator compose toggle — vises kun når det allerede er broadcasts,
            ellers tar EmptyState over som primær CTA og dette ville duplisert. */}
        {isCreator && !composeOpen && !recording && messages.length > 0 && (
          <button
            onClick={() => setComposeOpen(true)}
            className="relative mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all hover:scale-[1.01]"
            style={{
              background: "var(--bg-tertiary)",
              border:     "1px solid var(--border-default)",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                color:      "#fff",
              }}
            >
              {initials(userName)}
            </div>
            <span className="flex-1 text-left text-sm" style={{ color: "var(--text-tertiary)" }}>
              Hva vil du dele med ♛-ene dine?
            </span>
            {/* Mini-action-chips for raske formater */}
            <div className="hidden sm:flex items-center gap-1">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:scale-110"
                style={{ background: "rgba(94,234,212,0.15)", color: "#5EEAD4" }}
                title="Voice-note"
              >
                <Mic className="h-3.5 w-3.5" />
              </span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:scale-110"
                style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
                title="Bilde"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <Sparkles className="h-4 w-4" style={{ color: "#A855F7" }} />
          </button>
        )}
      </div>

      {/* ── Stories strip ──────────────────────────────────────────────────── */}
      {/* Skjul story-strip når både stories OG broadcasts er tomme — i den
          tilstanden bakes story-knappen inn i EmptyState så vi ikke får en
          orphan-sirkel som svever alene under header'en. */}
      {(storyGroups.length > 0 || messages.length > 0) && (
        <StoryStrip
          groups={storyGroups}
          canPost={isCreator}
          onAdd={() => setStoryCaptureOn(true)}
          onOpen={(idx) => setStoryViewerIdx(idx)}
        />
      )}

      {/* Story capture modal */}
      {storyCaptureOn && (
        <StoryCapture
          channelId={channelId}
          onClose={() => setStoryCaptureOn(false)}
          onPosted={() => void refetchStories()}
        />
      )}

      {/* Story viewer */}
      {storyViewerIdx !== null && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          startGroupIdx={storyViewerIdx}
          currentUserId={userId}
          canDelete={canDeleteStory}
          onClose={() => setStoryViewerIdx(null)}
          onDeleted={handleStoryDeleted}
          onViewed={handleStoryViewed}
        />
      )}

      {/* ── Compose box ────────────────────────────────────────────────────── */}
      {isCreator && composeOpen && !recording && (
        <div
          className="shrink-0 px-6 py-4 border-b border-white/10"
          style={{ background: "rgba(168,85,247,0.04)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
            >
              {initials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <RichTextEditor
                ref={editorRef}
                placeholder="Skriv en broadcast til dine ♛-medlemmer…"
                showFormatByDefault
                enterMakesNewline
                minHeight={120}
                onChange={(text) => setComposeText(text)}
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    onClick={() => setRecording(true)}
                    title="Voice-note"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <label
                    title="Bilde"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = "";
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        if (!res.ok) return;
                        const data = await res.json() as { url: string };
                        const html = editorRef.current?.getHTML() ?? "";
                        await postBroadcast(html, undefined, undefined, data.url);
                      }}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setComposeOpen(false); setComposeText(""); editorRef.current?.clear(); }}
                    className="rounded-full px-4 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => {
                      const html = editorRef.current?.getHTML() ?? "";
                      void postBroadcast(html);
                    }}
                    disabled={!composeText.trim() || isPending}
                    className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-transform hover:scale-[1.03] disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                      color:      "#FFFFFF",
                    }}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send broadcast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Voice recorder (inline replacement) ─────────────────────────────── */}
      {isCreator && recording && (
        <div className="shrink-0 px-6 py-4 border-b border-white/10" style={{ background: "rgba(168,85,247,0.04)" }}>
          <VoiceRecorder
            onCancel={() => setRecording(false)}
            onSend={async (audioUrl, duration) => {
              setRecording(false);
              const html = editorRef.current?.getHTML() ?? "";
              await postBroadcast(html || " ", audioUrl, duration);
            }}
          />
        </div>
      )}

      {/* ── Feed ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Henter broadcasts…
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            isCreator={isCreator}
            channelName={channelName}
            onCompose={() => setComposeOpen(true)}
            onVoiceNote={() => setRecording(true)}
            onStoryAdd={() => setStoryCaptureOn(true)}
          />
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="space-y-3 mb-6">
                {pinned.map((m) => (
                  <BroadcastPost
                    key={m.id}
                    message={m}
                    userId={userId}
                    isCreator={isCreator}
                    onReact={react}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    pinned
                  />
                ))}
              </div>
            )}

            {/* Regular feed */}
            {regular.length > 0 && pinned.length > 0 && (
              <div className="flex items-center gap-3 px-1 mb-4">
                <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
                <span className="text-[10px] uppercase tracking-wider text-white/30">Alle broadcasts</span>
                <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
              </div>
            )}

            {regular.map((m) => (
              <BroadcastPost
                key={m.id}
                message={m}
                userId={userId}
                isCreator={isCreator}
                onReact={react}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>

      {/* Floating "compose" button when scrolled (creator only) */}
      {isCreator && !composeOpen && !recording && messages.length > 3 && (
        <button
          onClick={() => { setComposeOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="absolute bottom-6 right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110"
          style={{
            background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
            color:      "#FFFFFF",
            boxShadow:  "0 8px 32px rgba(168,85,247,0.5)",
          }}
          title="Ny broadcast"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Empty state                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function EmptyState({
  isCreator, channelName, onCompose, onVoiceNote, onStoryAdd,
}: {
  isCreator:   boolean;
  channelName: string;
  onCompose:   () => void;
  onVoiceNote: () => void;
  onStoryAdd:  () => void;
}) {
  if (isCreator) {
    return (
      <div className="relative mx-auto max-w-2xl py-8 px-2">
        {/* Hero — gradient-kort med crown og pulsende glow */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(94,234,212,0.10) 0%, rgba(168,85,247,0.14) 50%, rgba(96,165,250,0.10) 100%)",
            border:     "1px solid rgba(168,85,247,0.25)",
          }}
        >
          {/* Bakgrunns-blobs */}
          <div
            aria-hidden
            className="absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-50 blur-[80px]"
            style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full opacity-40 blur-[70px]"
            style={{ background: "radial-gradient(circle, #5EEAD4, transparent 70%)" }}
          />

          <div className="relative flex flex-col items-center text-center">
            {/* Crown med pulserende ring */}
            <div className="relative mb-5">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl animate-ping"
                style={{
                  background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                  opacity:    0.35,
                }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
                style={{
                  background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                  color:      "#FFFFFF",
                  boxShadow:  "0 16px 48px rgba(168,85,247,0.45)",
                }}
              >
                ♛
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Velkommen til #{channelName}
            </h2>
            <p className="text-sm mb-6 leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
              Dette er ditt private rom for de mest engasjerte fansene dine. Bare
              ♛-medlemmer ser det du deler her.
            </p>

            {/* Primær CTA */}
            <button
              onClick={onCompose}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.03] mb-3"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                color:      "#FFFFFF",
                boxShadow:  "0 8px 24px rgba(168,85,247,0.4)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Skriv første broadcast
            </button>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              eller velg et format under
            </p>
          </div>
        </div>

        {/* Quick-action-grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <QuickActionTile
            icon={<Type className="h-5 w-5" />}
            label="Tekst"
            desc="Lengre oppdatering"
            color="#A855F7"
            onClick={onCompose}
          />
          <QuickActionTile
            icon={<Mic className="h-5 w-5" />}
            label="Voice-note"
            desc="Personlig vibe"
            color="#5EEAD4"
            onClick={onVoiceNote}
          />
          <QuickActionTile
            icon={<Camera className="h-5 w-5" />}
            label="Story"
            desc="Forsvinner etter 24t"
            color="#F472B6"
            onClick={onStoryAdd}
          />
          <QuickActionTile
            icon={<ImageIcon className="h-5 w-5" />}
            label="Bilde"
            desc="Sneak-peek el. BTS"
            color="#60A5FA"
            onClick={onCompose}
          />
        </div>

        {/* Tips-rad */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "var(--bg-tertiary)",
            border:     "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#FBBF24" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Tips for første post</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Si hei, fortell hva ♛-medlemmer kan forvente — eksklusivt innhold, early access,
              eller bare mer ekte deg. Personlighet vinner over polish.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fan-variant — venter på creator
  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <div
        className="relative overflow-hidden rounded-3xl p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(94,234,212,0.06) 0%, rgba(168,85,247,0.08) 100%)",
          border:     "1px solid rgba(168,85,247,0.20)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-30 blur-[60px]"
          style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
        />

        <div className="relative">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "rgba(168,85,247,0.15)",
              border:     "1px solid rgba(168,85,247,0.3)",
            }}
          >
            <Crown className="h-7 w-7" style={{ color: "#A855F7" }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Ingen broadcasts ennå
          </h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
            Creatoren har ikke sendt noe i denne kanalen ennå. Du får et varsel
            så snart første post kommer.
          </p>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
            style={{
              background: "rgba(94,234,212,0.10)",
              color:      "#5EEAD4",
              border:     "1px solid rgba(94,234,212,0.25)",
            }}
          >
            <Eye className="h-3 w-3" />
            Du er medlem av innersirkelen
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionTile({
  icon, label, desc, color, onClick,
}: {
  icon:    React.ReactNode;
  label:   string;
  desc:    string;
  color:   string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
      style={{
        background: "var(--bg-tertiary)",
        border:     "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{
          background: `${color}15`,
          color:      color,
          border:     `1px solid ${color}30`,
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{desc}</p>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Single broadcast post                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function BroadcastPost({
  message, userId, isCreator, onReact, onEdit, onDelete, pinned,
}: {
  message:   MessageWithAuthor;
  userId:    string;
  isCreator: boolean;
  onReact:   (id: string, emoji: string) => void | Promise<void>;
  onEdit:    (id: string, content: string) => void | Promise<void>;
  onDelete:  (id: string) => void | Promise<void>;
  pinned?:   boolean;
}) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [editText,       setEditText]       = useState(message.content);
  const [confirmDel,     setConfirmDel]     = useState(false);

  const isOwn   = message.authorId === userId;
  const canEdit = isOwn;
  const canDel  = isOwn || isCreator;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  function saveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) { setEditing(false); return; }
    void onEdit(message.id, trimmed);
    setEditing(false);
  }

  return (
    <article
      className="relative rounded-2xl p-5 transition-colors hover:border-white/[0.18]"
      style={{
        background: pinned
          ? "linear-gradient(135deg, rgba(94,234,212,0.06), rgba(168,85,247,0.06))"
          : "var(--bg-glass)",
        border:     pinned
          ? "1px solid rgba(168,85,247,0.30)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {pinned && (
        <div className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
             style={{ background: "#A855F7", color: "#fff" }}>
          <Pin className="h-2.5 w-2.5" /> Festet
        </div>
      )}

      {/* Author + time + kebab */}
      <header className="flex items-center gap-2.5 mb-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
            color:      "#fff",
          }}
        >
          {initials(message.author.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white">{message.author.name ?? "Ukjent"}</span>
            <FanpassBadge size={11} />
          </div>
          <p className="text-[11px] text-white/40">
            {fmt(message.createdAt)}
            {message.editedAt && <span className="ml-1 opacity-70">(redigert)</span>}
          </p>
        </div>

        {/* Kebab menu — only for owner/admin/author */}
        {(canEdit || canDel) && !editing && !confirmDel && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              title="Mer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 z-30 w-40 overflow-hidden rounded-xl shadow-2xl"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}
              >
                {canEdit && (
                  <button
                    onClick={() => { setEditing(true); setEditText(message.content); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rediger
                  </button>
                )}
                {canDel && (
                  <button
                    onClick={() => { setConfirmDel(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Slett
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Delete confirm */}
      {confirmDel && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
          <span className="flex-1 text-xs text-rose-200">Slette denne broadcast-en?</span>
          <button
            onClick={() => setConfirmDel(false)}
            className="rounded-md px-2 py-1 text-[11px] text-white/60 hover:text-white"
          >
            Avbryt
          </button>
          <button
            onClick={() => { void onDelete(message.id); setConfirmDel(false); }}
            className="rounded-md bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-400"
          >
            Slett
          </button>
        </div>
      )}

      {/* Content — editable mode */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setEditing(false); setEditText(message.content); }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
            }}
            rows={3}
            autoFocus
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[15px] text-white outline-none focus:border-violet-500/40 resize-none"
            style={{ minHeight: 70 }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setEditText(message.content); }}
              className="rounded-full px-3 py-1 text-[11px] text-white/60 hover:text-white"
            >
              <X className="inline h-3 w-3" /> Avbryt
            </button>
            <button
              onClick={saveEdit}
              disabled={!editText.trim()}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
            >
              <Check className="h-3 w-3" /> Lagre
            </button>
          </div>
        </div>
      ) : (
        message.content && message.content.trim() !== "" && (
          <div className="text-[15px] leading-relaxed text-white/90 mb-3">
            <SafeHtml content={message.content} />
          </div>
        )
      )}

      {message.imageUrl && (
        <button onClick={() => window.open(message.imageUrl!, "_blank")} className="block mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.imageUrl}
            alt=""
            className="max-h-80 max-w-full rounded-xl object-cover ring-1 ring-white/10"
          />
        </button>
      )}

      {message.audioUrl && (
        <div className="mb-3">
          <VoiceMessage url={message.audioUrl} durationSec={message.audioDuration} />
        </div>
      )}

      {/* Reactions */}
      <footer className="flex items-center gap-1.5 mt-2 relative">
        {message.reactions.length > 0 && message.reactions.map(({ emoji, count, reactedByMe }) => (
          <button
            key={emoji}
            onClick={() => void onReact(message.id, emoji)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              reactedByMe
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20"
            }`}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        ))}

        <div className="relative">
          <button
            onClick={() => setShowQuickReact((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/40 hover:border-white/20 hover:text-white/80 transition-colors"
            title="Reager"
          >
            <Heart className="h-3.5 w-3.5" />
          </button>
          {showQuickReact && (
            <div
              className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-2xl border border-white/10 px-2 py-1.5 shadow-2xl z-20"
              style={{ background: "var(--bg-secondary)" }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { void onReact(message.id, emoji); setShowQuickReact(false); }}
                  className="rounded-lg p-1.5 text-lg leading-none transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {(message.replyCount ?? 0) > 0 && (
          <button className="ml-auto flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
            <MessageCircle className="h-3 w-3" />
            {message.replyCount} {message.replyCount === 1 ? "svar" : "svar"}
          </button>
        )}
      </footer>
    </article>
  );
}
