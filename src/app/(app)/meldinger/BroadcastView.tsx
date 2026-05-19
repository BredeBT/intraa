"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Send, Mic, Image as ImageIcon, Loader2, Heart, MessageCircle, Pin, Sparkles, ChevronUp } from "lucide-react";
import { getMessages, sendMessage, toggleReaction } from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import VoiceMessage from "@/components/VoiceMessage";
import VoiceRecorder from "@/components/VoiceRecorder";
import { FanpassBadge } from "@/components/FanpassBadge";
import SafeHtml from "@/components/SafeHtml";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isCreator = userRole === "OWNER" || userRole === "ADMIN";

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

  // Focus textarea when compose opens
  useEffect(() => {
    if (composeOpen) inputRef.current?.focus();
  }, [composeOpen]);

  async function postBroadcast(content: string, audioUrl?: string, audioDuration?: number, imageUrl?: string) {
    if (!content.trim() && !audioUrl && !imageUrl) return;
    startTransition(async () => {
      try {
        const msg = await sendMessage(channelId, content || " ", undefined, imageUrl, audioUrl, audioDuration);
        setMessages((prev) => [msg, ...prev]);
        void broadcast(msg);
        setComposeText("");
        setComposeOpen(false);
      } catch (err) {
        console.warn("[broadcast] post failed:", err);
      }
    });
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

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: "#050816" }}>

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

        {/* Creator compose toggle */}
        {isCreator && !composeOpen && !recording && (
          <button
            onClick={() => setComposeOpen(true)}
            className="relative mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border:     "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
            >
              {initials(userName)}
            </div>
            <span className="flex-1 text-left text-sm text-white/40">Hva vil du dele med ♛-ene dine?</span>
            <Sparkles className="h-4 w-4" style={{ color: "#A855F7" }} />
          </button>
        )}
      </div>

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
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void postBroadcast(composeText); }
                  if (e.key === "Escape") { setComposeOpen(false); setComposeText(""); }
                }}
                placeholder="Skriv en broadcast til dine ♛-medlemmer…"
                rows={3}
                className="w-full bg-transparent text-base text-white placeholder:text-white/30 outline-none resize-none"
                style={{ minHeight: 70 }}
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
                        await postBroadcast(composeText, undefined, undefined, data.url);
                      }}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setComposeOpen(false); setComposeText(""); }}
                    className="rounded-full px-4 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => void postBroadcast(composeText)}
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
              await postBroadcast(composeText || " ", audioUrl, duration);
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
          <EmptyState isCreator={isCreator} onCompose={() => setComposeOpen(true)} />
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="space-y-3 mb-6">
                {pinned.map((m) => (
                  <BroadcastPost key={m.id} message={m} userId={userId} onReact={react} pinned />
                ))}
              </div>
            )}

            {/* Regular feed */}
            {regular.length > 0 && pinned.length > 0 && (
              <div className="flex items-center gap-3 px-1 mb-4">
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.10)" }} />
                <span className="text-[10px] uppercase tracking-wider text-white/30">Alle broadcasts</span>
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.10)" }} />
              </div>
            )}

            {regular.map((m) => (
              <BroadcastPost key={m.id} message={m} userId={userId} onReact={react} />
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

function EmptyState({ isCreator, onCompose }: { isCreator: boolean; onCompose: () => void }) {
  if (isCreator) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          style={{
            background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
            color:      "#fff",
            boxShadow:  "0 12px 36px rgba(168,85,247,0.35)",
          }}
        >
          ♛
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Send din første broadcast</h2>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          Dette er ditt private rom for de mest engasjerte fansene dine. Del en oppdatering,
          en voice-note eller en sneak-peek — bare ♛-medlemmer ser det.
        </p>
        <button
          onClick={onCompose}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
            color:      "#FFFFFF",
            boxShadow:  "0 8px 24px rgba(168,85,247,0.4)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          Skriv første broadcast
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
      >
        💌
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Ingen broadcasts ennå</h2>
      <p className="text-sm text-white/50 leading-relaxed">
        Creatoren har ikke sendt noen broadcasts i denne kanalen ennå. Du får varsel
        så snart noe kommer ut.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Single broadcast post                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function BroadcastPost({
  message, userId, onReact, pinned,
}: {
  message:   MessageWithAuthor;
  userId:    string;
  onReact:   (id: string, emoji: string) => void | Promise<void>;
  pinned?:   boolean;
}) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const isOwn = message.authorId === userId;
  void isOwn;

  return (
    <article
      className="relative rounded-2xl p-5 transition-colors hover:border-white/[0.18]"
      style={{
        background: pinned
          ? "linear-gradient(135deg, rgba(94,234,212,0.06), rgba(168,85,247,0.06))"
          : "rgba(255,255,255,0.03)",
        border:     pinned
          ? "1px solid rgba(168,85,247,0.30)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {pinned && (
        <div className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
             style={{ background: "#A855F7", color: "#fff" }}>
          <Pin className="h-2.5 w-2.5" /> Festet
        </div>
      )}

      {/* Author + time */}
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
          <p className="text-[11px] text-white/40">{fmt(message.createdAt)}</p>
        </div>
      </header>

      {/* Content */}
      {message.content && message.content.trim() !== "" && (
        <div className="text-[15px] leading-relaxed text-white/90 mb-3">
          <SafeHtml content={message.content} />
        </div>
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
              style={{ background: "#0B1027" }}
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
