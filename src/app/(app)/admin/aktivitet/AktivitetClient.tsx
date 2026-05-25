"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, FileText, ShieldAlert, UserX, UserCheck, EyeOff, Trash2, Settings, UserPlus, X, ChevronDown } from "lucide-react";

interface ActorInfo {
  id:        string;
  name:      string | null;
  username:  string;
  avatarUrl: string | null;
}

interface AuditItem {
  id:         string;
  action:     string;
  targetType: string | null;
  targetId:   string | null;
  metadata:   Record<string, unknown> | null;
  ipAddress:  string | null;
  createdAt:  string;
  actor:      ActorInfo;
}

const S = {
  surface:  "var(--bg-secondary)",
  surface2: "var(--bg-tertiary)",
  line:     "var(--border-subtle)",
  text:     "var(--text-primary)",
  muted:    "var(--text-secondary)",
  subtle:   "var(--text-tertiary)",
  teal:     "#5EEAD4",
  rose:     "#F87171",
  amber:    "#FBBF24",
  blue:     "#60A5FA",
  purple:   "#A855F7",
  green:    "#34D399",
} as const;

// Mapping fra action-streng til ikon, label og fargetone
const ACTION_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  "post.hide":             { label: "Skjulte innlegg",         icon: EyeOff,      color: S.amber },
  "post.unhide":           { label: "Gjorde innlegg synlig",   icon: EyeOff,      color: S.green },
  "post.delete":           { label: "Slettet innlegg",         icon: Trash2,      color: S.rose },
  "comment.hide":          { label: "Skjulte kommentar",       icon: EyeOff,      color: S.amber },
  "comment.unhide":        { label: "Gjorde kommentar synlig", icon: EyeOff,      color: S.green },
  "comment.delete":        { label: "Slettet kommentar",       icon: Trash2,      color: S.rose },
  "member.ban":            { label: "Banet medlem",            icon: UserX,       color: S.rose },
  "member.unban":          { label: "Opphevet ban",            icon: UserCheck,   color: S.green },
  "member.remove":         { label: "Fjernet medlem",          icon: UserX,       color: S.rose },
  "member.role_change":    { label: "Endret rolle",            icon: ShieldAlert, color: S.purple },
  "join_request.approve":  { label: "Godkjente forespørsel",   icon: UserPlus,    color: S.green },
  "join_request.reject":   { label: "Avslo forespørsel",       icon: X,           color: S.rose },
  "org.update":            { label: "Oppdaterte settings",     icon: Settings,    color: S.blue },
  "org.join_type":         { label: "Endret medlemskaps-modus", icon: ShieldAlert, color: S.purple },
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "nå";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `${d} d siden`;
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
}

const ALL_ACTIONS = Object.keys(ACTION_META);

export default function AktivitetClient({
  initial, initialNextCursor,
}: {
  initial:           AuditItem[];
  initialNextCursor: string | null;
}) {
  const [items,      setItems]      = useState<AuditItem[]>(initial);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading,    setLoading]    = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter,     setFilter]     = useState<string>("ALL");
  const [days,       setDays]       = useState<number>(30);

  // Re-fetch når filter/days endres (skip initial)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("action", filter);
      params.set("days", String(days));
      try {
        const r = await fetch(`/api/admin/audit-log?${params}`);
        if (r.ok && !cancelled) {
          const data = await r.json() as { items: AuditItem[]; nextCursor: string | null };
          setItems(data.items);
          setNextCursor(data.nextCursor);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter, days]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("action", filter);
    params.set("days", String(days));
    params.set("cursor", nextCursor);
    try {
      const r = await fetch(`/api/admin/audit-log?${params}`);
      if (r.ok) {
        const data = await r.json() as { items: AuditItem[]; nextCursor: string | null };
        setItems((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8" style={{ color: S.text }}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: S.text }}>Aktivitet</h1>
        <p className="mt-1 text-sm" style={{ color: S.muted }}>
          Hvem har gjort hva i communityet — moderation, medlems-endringer, settings.
        </p>
      </div>

      {/* Filter-rad */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none rounded-xl py-2.5 pl-4 pr-9 text-sm outline-none transition-colors"
            style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.text }}
          >
            <option value="ALL">Alle handlinger</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
        </div>

        <div className="relative">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="appearance-none rounded-xl py-2.5 pl-4 pr-9 text-sm outline-none transition-colors"
            style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.text }}
          >
            <option value={1}>Siste døgn</option>
            <option value={7}>Siste 7 dager</option>
            <option value={30}>Siste 30 dager</option>
            <option value={90}>Siste 90 dager</option>
            <option value={365}>Siste år</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
        </div>

        {loading && <Loader2 className="h-4 w-4 animate-spin self-center" style={{ color: S.muted }} />}
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <FileText className="mx-auto mb-3 h-7 w-7" style={{ color: S.subtle }} />
          <p className="text-sm font-medium" style={{ color: S.text }}>Ingen aktivitet i dette tidsrommet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => <AuditRow key={item.id} item={item} />)}
        </div>
      )}

      {nextCursor && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: S.surface, color: S.text, border: `1px solid ${S.line}` }}
          >
            {loadingMore ? "Laster…" : "Last flere"}
          </button>
        </div>
      )}
    </div>
  );
}

function AuditRow({ item }: { item: AuditItem }) {
  const meta = ACTION_META[item.action] ?? { label: item.action, icon: FileText, color: S.muted };
  const Icon = meta.icon;
  const initials = (item.actor.name ?? item.actor.username).slice(0, 2).toUpperCase();

  // Bygge en kompakt beskrivelse fra metadata
  const detail = describeDetail(item);

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3"
      style={{ background: S.surface, border: `1px solid ${S.line}` }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: S.text }}>
          <Link href={`/u/${item.actor.username}`} className="font-semibold transition-opacity hover:opacity-80">
            {item.actor.name ?? item.actor.username}
          </Link>
          <span style={{ color: S.muted }}> — {meta.label.toLowerCase()}</span>
        </p>
        {detail && (
          <p className="mt-0.5 text-xs" style={{ color: S.subtle }}>{detail}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-[11px]" style={{ color: S.subtle }}>{relativeDate(item.createdAt)}</span>
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold"
          style={{ background: S.surface2, color: S.muted }}
          title={item.actor.name ?? item.actor.username}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}

function describeDetail(item: AuditItem): string | null {
  const md = item.metadata as Record<string, unknown> | null;
  if (!md) return item.targetId ? `ID: ${truncId(item.targetId)}` : null;

  // Spesifikke formateringer per action
  if (item.action === "org.join_type" && md.from && md.to) {
    return `Fra "${md.from}" til "${md.to}"`;
  }
  if (item.action === "post.hide" && typeof md.reason === "string" && md.reason) {
    return `Årsak: ${md.reason}`;
  }
  if (item.action === "comment.hide" && typeof md.reason === "string" && md.reason) {
    return `Årsak: ${md.reason}`;
  }
  if (item.action === "member.remove" && md.removedRole) {
    return `Var: ${md.removedRole}`;
  }
  if (item.targetId) {
    return `ID: ${truncId(item.targetId)}`;
  }
  return null;
}

function truncId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}
