"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, ChevronDown, MessageCircle } from "lucide-react";

interface ThreadItem {
  id:            string;
  subject:       string;
  status:        string;
  createdAt:     string;
  lastMessageAt: string;
  sponsor:       { id: string; brandName: string; slug: string; logoUrl: string | null };
  creator:       { id: string; name: string | null; username: string; avatarUrl: string | null };
  lastMessage:   { content: string; createdAt: string; senderRole: string; isFromMe: boolean } | null;
  unreadCount:   number;
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
  PENDING:  { label: "Venter på svar", color: S.amber },
  ACCEPTED: { label: "Godtatt",        color: S.green },
  DECLINED: { label: "Avslått",        color: S.rose },
  ARCHIVED: { label: "Arkivert",       color: S.subtle },
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "nå";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h} t`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} d`;
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

export default function ThreadList({
  basePath, viewerRole, title, subtitle,
}: {
  basePath:   string;        // "/brand/innboks" eller "/sponsor-henvendelser"
  viewerRole: "SPONSOR" | "CREATOR";
  title:      string;
  subtitle:   string;
}) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [status,  setStatus]  = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const r = await fetch(`/api/sponsor/threads?${params}`);
      if (r.ok && !cancelled) {
        const data = await r.json() as { threads: ThreadItem[] };
        setThreads(data.threads);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [status]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      {title && (
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: S.text }}>
            <Inbox className="h-6 w-6" style={{ color: S.purple }} />
            {title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: S.muted }}>{subtitle}</p>
        </div>
      )}

      {/* Status-filter */}
      <div className="mb-5 relative inline-block">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="appearance-none rounded-xl py-2.5 pl-4 pr-9 text-sm outline-none"
          style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.text }}
        >
          <option value="ALL">Alle</option>
          <option value="PENDING">Venter på svar</option>
          <option value="ACCEPTED">Godtatt</option>
          <option value="DECLINED">Avslått</option>
          <option value="ARCHIVED">Arkivert</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: S.muted }} />
        </div>
      ) : threads.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <MessageCircle className="mx-auto mb-3 h-7 w-7" style={{ color: S.subtle }} />
          <p className="text-sm font-medium" style={{ color: S.text }}>
            {viewerRole === "SPONSOR"
              ? "Ingen henvendelser ennå."
              : "Ingen sponsor-henvendelser ennå."}
          </p>
          <p className="mt-1 text-xs" style={{ color: S.muted }}>
            {viewerRole === "SPONSOR"
              ? <>Gå til <Link href="/brand/creators" className="underline" style={{ color: S.purple }}>Finn creators</Link> for å starte en samtale.</>
              : "Når en sponsor tar kontakt, dukker det opp her — separat fra vanlige meldinger."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const meta  = STATUS_META[t.status] ?? STATUS_META.PENDING;
            const other = viewerRole === "SPONSOR" ? t.creator : t.sponsor;
            const otherName = "brandName" in other ? other.brandName : (other.name ?? other.username);
            const otherLogo = "logoUrl" in other ? other.logoUrl : other.avatarUrl;
            const initials = otherName.slice(0, 2).toUpperCase();

            return (
              <Link
                key={t.id}
                href={`${basePath}/${t.id}`}
                className="flex items-start gap-3 rounded-2xl p-4 transition-all hover:scale-[1.005]"
                style={{
                  background: S.surface,
                  border:     t.unreadCount > 0 ? `1px solid ${S.purple}40` : `1px solid ${S.line}`,
                }}
              >
                {/* Avatar */}
                {otherLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otherLogo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ background: S.surface2, color: S.muted }}
                  >
                    {initials}
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className="truncate text-sm font-semibold" style={{ color: S.text }}>{otherName}</p>
                    <span className="shrink-0 text-[11px]" style={{ color: S.subtle }}>{relativeDate(t.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-sm font-medium mb-1" style={{ color: S.text }}>{t.subject}</p>
                  {t.lastMessage && (
                    <p className="line-clamp-1 text-xs" style={{ color: S.muted }}>
                      {t.lastMessage.isFromMe && <span style={{ color: S.subtle }}>Du: </span>}
                      {t.lastMessage.content}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                    >
                      {meta.label}
                    </span>
                    {t.unreadCount > 0 && (
                      <span
                        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                        style={{ background: S.purple, color: "#fff" }}
                      >
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
