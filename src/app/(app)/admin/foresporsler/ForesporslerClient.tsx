"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Check, X, Loader2, MessageSquare, Clock, ChevronDown } from "lucide-react";

interface JoinRequestItem {
  id:         string;
  status:     string;
  message:    string | null;
  createdAt:  string;
  reviewedAt: string | null;
  user: {
    id:        string;
    name:      string | null;
    username:  string;
    email:     string;
    avatarUrl: string | null;
    bio:       string | null;
    createdAt: string | Date;
  };
}

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

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
  green:    "#34D399",
  purple:   "#A855F7",
} as const;

function relativeDate(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - t.getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "nå";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} d siden`;
  return t.toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default function ForesporslerClient({ initial }: { initial: JoinRequestItem[] }) {
  const [requests, setRequests] = useState<JoinRequestItem[]>(initial);
  const [query,    setQuery]    = useState("");
  const [status,   setStatus]   = useState<StatusFilter>("PENDING");
  const [loading,  setLoading]  = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const initialMount = useRef(true);

  // Re-fetch ved query/status-endring (skipper første render — initial er server-rendret)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        params.set("status", status);
        const r = await fetch(`/api/admin/join-requests?${params}`);
        if (r.ok) {
          const data = await r.json() as { requests: JoinRequestItem[] };
          setRequests(data.requests);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, status]);

  async function act(requestId: string, action: "approve" | "reject") {
    setActingOn(requestId);
    try {
      const r = await fetch(`/api/admin/join-requests/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      if (r.ok) {
        // Fjern fra listen hvis vi viser PENDING; ellers oppdater status
        if (status === "PENDING") {
          setRequests((prev) => prev.filter((x) => x.id !== requestId));
        } else {
          setRequests((prev) => prev.map((x) =>
            x.id === requestId ? { ...x, status: action === "approve" ? "APPROVED" : "REJECTED", reviewedAt: new Date().toISOString() } : x
          ));
        }
      }
    } finally {
      setActingOn(null);
    }
  }

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests]
  );

  return (
    <div className="px-4 py-5 md:px-6 md:py-8" style={{ color: S.text }}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: S.text }}>
          Medlemskaps-forespørsler
        </h1>
        <p className="mt-1 text-sm" style={{ color: S.muted }}>
          Brukere som vil bli medlem av communityet. Godkjenn eller avslå.
        </p>
      </div>

      {/* Filter + søk */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter navn, brukernavn eller e-post…"
            className="w-full rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none transition-colors"
            style={{
              background: S.surface,
              border:     `1px solid ${S.line}`,
              color:      S.text,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-white/[0.06]"
            >
              <X className="h-3.5 w-3.5" style={{ color: S.subtle }} />
            </button>
          )}
        </div>

        {/* Status-filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="appearance-none rounded-xl py-2.5 pl-4 pr-9 text-sm outline-none transition-colors"
            style={{
              background: S.surface,
              border:     `1px solid ${S.line}`,
              color:      S.text,
            }}
          >
            <option value="PENDING">Venter på svar</option>
            <option value="APPROVED">Godkjente</option>
            <option value="REJECTED">Avslåtte</option>
            <option value="ALL">Alle</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
        </div>

        {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: S.muted }} />}
      </div>

      {/* Liste */}
      {requests.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <Check className="mx-auto mb-3 h-8 w-8" style={{ color: S.subtle }} />
          <p className="text-sm font-medium" style={{ color: S.text }}>
            {status === "PENDING"
              ? "Ingen forespørsler venter."
              : query
                ? "Ingen treff."
                : "Ingen forespørsler i denne kategorien."}
          </p>
          <p className="mt-1 text-xs" style={{ color: S.muted }}>
            {status === "PENDING" && !query
              ? "Når noen ber om å bli med, dukker de opp her."
              : "Prøv et annet søk eller filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              acting={actingOn === r.id}
              onApprove={() => void act(r.id, "approve")}
              onReject={() => void act(r.id, "reject")}
            />
          ))}
        </div>
      )}

      {pendingCount > 0 && status === "PENDING" && (
        <p className="mt-4 text-center text-xs" style={{ color: S.subtle }}>
          {pendingCount} {pendingCount === 1 ? "forespørsel" : "forespørsler"} venter på behandling
        </p>
      )}
    </div>
  );
}

function RequestRow({
  request: r, acting, onApprove, onReject,
}: {
  request:    JoinRequestItem;
  acting:     boolean;
  onApprove:  () => void;
  onReject:   () => void;
}) {
  const initials = (r.user.name ?? r.user.username).slice(0, 2).toUpperCase();
  const statusBadge =
    r.status === "APPROVED" ? { label: "Godkjent", color: S.green } :
    r.status === "REJECTED" ? { label: "Avslått",  color: S.rose } :
                              null;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-start"
      style={{ background: S.surface, border: `1px solid ${S.line}` }}
    >
      {/* Avatar */}
      {r.user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.user.avatarUrl}
          alt={r.user.name ?? r.user.username}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: S.surface2, color: S.muted }}
        >
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/u/${r.user.username}`}
            className="text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: S.text }}
          >
            {r.user.name ?? r.user.username}
          </Link>
          <span className="text-xs" style={{ color: S.subtle }}>@{r.user.username}</span>
          {statusBadge && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${statusBadge.color}15`, color: statusBadge.color, border: `1px solid ${statusBadge.color}30` }}
            >
              {statusBadge.label}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs" style={{ color: S.subtle }}>
          {r.user.email} · Bruker siden {relativeDate(r.user.createdAt)}
        </p>

        {r.user.bio && (
          <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: S.muted }}>
            {r.user.bio.replace(/<[^>]+>/g, "")}
          </p>
        )}

        {r.message && (
          <div
            className="mt-2 flex items-start gap-2 rounded-lg p-2.5 text-xs"
            style={{ background: S.surface2, border: `1px solid ${S.line}`, color: S.text }}
          >
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: S.subtle }} />
            <span style={{ whiteSpace: "pre-wrap" }}>{r.message}</span>
          </div>
        )}

        <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: S.subtle }}>
          <Clock className="h-3 w-3" />
          Spurte {relativeDate(r.createdAt)}
          {r.reviewedAt && r.status !== "PENDING" && (
            <span> · behandlet {relativeDate(r.reviewedAt)}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      {r.status === "PENDING" && (
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onApprove}
            disabled={acting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{ background: S.teal, color: "var(--bg-primary)" }}
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Godkjenn
          </button>
          <button
            onClick={onReject}
            disabled={acting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: S.surface2, color: S.muted, border: `1px solid ${S.line}` }}
          >
            <X className="h-3.5 w-3.5" />
            Avslå
          </button>
        </div>
      )}
    </div>
  );
}
