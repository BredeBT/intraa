"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Loader2, Check, X, Archive } from "lucide-react";
import { TAG_BY_SLUG } from "@/lib/creatorTags";

interface Thread {
  id:        string;
  subject:   string;
  status:    string;
  createdAt: string;
  sponsor:   { id: string; brandName: string; slug: string; logoUrl: string | null };
}
interface Message {
  id:         string;
  content:    string;
  senderRole: string;
  createdAt:  string;
  readAt:     string | null;
  author:     { id: string; name: string | null; username: string; avatarUrl: string | null };
  isFromMe:   boolean;
}
interface Creator {
  id:          string;
  name:        string | null;
  username:    string;
  avatarUrl:   string | null;
  bio:         string | null;
  creatorTags: string[];
}

const S = {
  surface:  "var(--bg-secondary)",
  surface2: "var(--bg-tertiary)",
  line:     "var(--border-subtle)",
  text:     "var(--text-primary)",
  muted:    "var(--text-secondary)",
  subtle:   "var(--text-tertiary)",
  teal:     "#5EEAD4",
  purple:   "#A855F7",
  amber:    "#FBBF24",
  green:    "#34D399",
  rose:     "#F87171",
} as const;

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Venter",     color: S.amber },
  ACCEPTED: { label: "Godtatt",    color: S.green },
  DECLINED: { label: "Avslått",    color: S.rose },
  ARCHIVED: { label: "Arkivert",   color: S.subtle },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("no-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ThreadView({
  threadId, backPath,
}: {
  threadId: string;
  backPath: string;
}) {
  const router = useRouter();
  const [thread,   setThread]   = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [creator,  setCreator]  = useState<Creator | null>(null);
  const [role,     setRole]     = useState<"SPONSOR" | "CREATOR" | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [reply,    setReply]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [acting,   setActing]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadThread() {
    const r = await fetch(`/api/sponsor/threads/${threadId}`);
    if (!r.ok) {
      router.push(backPath);
      return;
    }
    const data = await r.json() as {
      role:     "SPONSOR" | "CREATOR";
      thread:   Thread;
      messages: Message[];
      creator:  Creator;
    };
    setRole(data.role);
    setThread(data.thread);
    setMessages(data.messages);
    setCreator(data.creator);
    setLoading(false);
  }

  useEffect(() => { void loadThread(); }, [threadId]);

  // Scroll til bunn ved første load + nye meldinger
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
    }
  }, [messages.length]);

  async function sendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/sponsor/threads/${threadId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: reply }),
      });
      if (r.ok) {
        setReply("");
        await loadThread();
      }
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: "ACCEPTED" | "DECLINED" | "ARCHIVED") {
    setActing(true);
    try {
      const r = await fetch(`/api/sponsor/threads/${threadId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (r.ok) await loadThread();
    } finally {
      setActing(false);
    }
  }

  if (loading || !thread) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin" style={{ color: S.muted }} /></div>;
  }

  const meta = STATUS_META[thread.status] ?? STATUS_META.PENDING;
  const otherName = role === "SPONSOR" ? (creator?.name ?? creator?.username ?? "Creator") : thread.sponsor.brandName;
  const otherInitials = otherName.slice(0, 2).toUpperCase();
  const canReply = thread.status !== "ARCHIVED" && thread.status !== "DECLINED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      {/* Tilbake */}
      <Link
        href={backPath}
        className="inline-flex items-center gap-1.5 text-xs mb-4 hover:opacity-80"
        style={{ color: S.muted }}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Tilbake til innboksen
      </Link>

      {/* Header */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: S.surface, border: `1px solid ${S.line}` }}
      >
        <div className="flex items-start gap-3 mb-3">
          {(role === "SPONSOR" ? creator?.avatarUrl : thread.sponsor.logoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(role === "SPONSOR" ? creator?.avatarUrl : thread.sponsor.logoUrl) ?? ""}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: S.surface2, color: S.muted }}
            >
              {otherInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: S.text }}>{otherName}</p>
            {role === "SPONSOR" && creator && (
              <Link href={`/u/${creator.username}`} className="text-xs hover:opacity-80" style={{ color: S.subtle }}>
                @{creator.username} ↗
              </Link>
            )}
            {role === "CREATOR" && (
              <Link href={`/brand/${thread.sponsor.slug}`} className="text-xs hover:opacity-80" style={{ color: S.subtle }}>
                Se brand-profil ↗
              </Link>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
          >
            {meta.label}
          </span>
        </div>

        <h2 className="text-lg font-bold" style={{ color: S.text }}>{thread.subject}</h2>

        {/* Creator-tagger (kun for sponsor-view) */}
        {role === "SPONSOR" && creator?.creatorTags && creator.creatorTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {creator.creatorTags.map((slug) => {
              const t = TAG_BY_SLUG[slug];
              if (!t) return null;
              return (
                <span key={slug} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: S.surface2, color: S.muted }}>
                  {t.emoji} {t.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Creator-actions: godta/avslå */}
        {role === "CREATOR" && thread.status === "PENDING" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void changeStatus("ACCEPTED")}
              disabled={acting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
              style={{ background: S.green, color: "var(--bg-primary)" }}
            >
              <Check className="h-3.5 w-3.5" /> Godta
            </button>
            <button
              onClick={() => void changeStatus("DECLINED")}
              disabled={acting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
              style={{ background: S.surface2, color: S.muted, border: `1px solid ${S.line}` }}
            >
              <X className="h-3.5 w-3.5" /> Avslå
            </button>
          </div>
        )}

        {/* Arkiver-knapp (begge roller) */}
        {thread.status !== "ARCHIVED" && (
          <button
            onClick={() => void changeStatus("ARCHIVED")}
            disabled={acting}
            className="mt-3 flex items-center gap-1.5 text-xs hover:opacity-80"
            style={{ color: S.subtle }}
          >
            <Archive className="h-3 w-3" /> Arkiver tråden
          </button>
        )}
      </div>

      {/* Meldinger */}
      <div className="space-y-3 mb-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.isFromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5"
              style={{
                background: m.isFromMe
                  ? "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)"
                  : S.surface,
                border: m.isFromMe ? "none" : `1px solid ${S.line}`,
                color:  m.isFromMe ? "#fff" : S.text,
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              <p className="mt-1 text-[10px]" style={{ color: m.isFromMe ? "rgba(255,255,255,0.65)" : S.subtle }}>
                {fmtTime(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply-boks */}
      {canReply ? (
        <div
          className="rounded-2xl p-4"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={role === "SPONSOR" ? "Skriv et svar til creatoren…" : "Skriv et svar til sponsoren…"}
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent text-sm outline-none resize-none"
            style={{ color: S.text }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs" style={{ color: S.subtle }}>{reply.length}/2000</span>
            <button
              onClick={() => void sendReply()}
              disabled={!reply.trim() || sending}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
              style={{ background: S.purple, color: "#fff" }}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-xs py-4" style={{ color: S.subtle }}>
          {thread.status === "ARCHIVED" ? "Tråden er arkivert." : "Tråden er lukket."}
        </p>
      )}
    </div>
  );
}
