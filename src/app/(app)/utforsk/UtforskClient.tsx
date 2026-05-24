"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, Radio, Crown, Loader2, Sparkles, Clock, ArrowUpDown, X } from "lucide-react";

interface Community {
  id:                string;
  slug:              string;
  name:              string;
  description:       string | null;
  joinType:          string;
  requiresFanpass:   boolean;
  memberCount:       number;
  isLive:            boolean;
  logoUrl:           string | null;
  bannerUrl:         string | null;
  isMember:          boolean;
  hasPendingRequest: boolean;
}

const S = {
  bg:       "var(--bg-primary)",
  surface:  "var(--bg-secondary)",
  surface2: "var(--bg-tertiary)",
  line:     "var(--border-subtle)",
  text:     "var(--text-primary)",
  muted:    "var(--text-secondary)",
  subtle:   "var(--text-tertiary)",
  teal:     "#5EEAD4",
  purple:   "#A855F7",
  blue:     "#60A5FA",
  pink:     "#F472B6",
  amber:    "#FBBF24",
  rose:     "#F87171",
} as const;

type Sort = "trending" | "new" | "alphabetical";

const SORT_LABELS: Record<Sort, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  trending:     { label: "Mest populære", icon: Sparkles },
  new:          { label: "Nyeste",        icon: Clock },
  alphabetical: { label: "A–Å",          icon: ArrowUpDown },
};

export default function UtforskClient({ initialCommunities }: { initialCommunities: Community[] }) {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [query,       setQuery]       = useState("");
  const [sort,        setSort]        = useState<Sort>("trending");
  const [loading,     setLoading]     = useState(false);
  const [joiningId,   setJoiningId]   = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const initialMount = useRef(true);

  // Debounced search + sort
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
        params.set("sort", sort);
        const r = await fetch(`/api/discover/communities?${params}`);
        if (r.ok) {
          const data = await r.json() as { communities: Community[] };
          setCommunities(data.communities);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, sort]);

  const liveCommunities = useMemo(
    () => communities.filter((c) => c.isLive).slice(0, 6),
    [communities]
  );

  async function joinCommunity(c: Community) {
    if (c.isMember) {
      router.push(`/${c.slug}/feed`);
      return;
    }
    if (c.hasPendingRequest) {
      setError("Forespørselen din venter på godkjenning fra eier.");
      return;
    }
    setJoiningId(c.id);
    setError(null);
    try {
      const r = await fetch("/api/org/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId: c.id }),
      });
      const data = await r.json() as {
        ok?:              boolean;
        joined?:          boolean;
        fanpassRequired?: boolean;
        fanpassCheckout?: string;
        pending?:         boolean;
        alreadyRequested?: boolean;
        message?:         string;
        error?:           string;
      };
      if (data.fanpassRequired && data.fanpassCheckout) {
        router.push(data.fanpassCheckout);
        return;
      }
      if (data.pending) {
        // Marker som pending i UI så knappen blir disabled
        setCommunities((prev) => prev.map((x) => x.id === c.id ? { ...x, hasPendingRequest: true } : x));
        setError(data.alreadyRequested
          ? "Du har allerede en forespørsel som venter på godkjenning."
          : "Forespørsel sendt! Du får beskjed når eieren har behandlet den.");
        return;
      }
      if (!r.ok || !data.ok) {
        setError(data.error ?? data.message ?? "Noe gikk galt");
        return;
      }
      // Joined — oppdater listen
      setCommunities((prev) => prev.map((x) => x.id === c.id ? { ...x, isMember: true, memberCount: x.memberCount + 1 } : x));
      router.push(`/${c.slug}/feed`);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: S.text }}>
          Utforsk communities
        </h1>
        <p className="text-sm" style={{ color: S.muted }}>
          Finn nye creators, miljøer og fellesskap som matcher interessene dine.
        </p>
      </div>

      {/* Søk + sortering */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter community-navn…"
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
              aria-label="Tøm søk"
            >
              <X className="h-3.5 w-3.5" style={{ color: S.subtle }} />
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: S.surface, border: `1px solid ${S.line}` }}>
          {(Object.keys(SORT_LABELS) as Sort[]).map((s) => {
            const Icon = SORT_LABELS[s].icon;
            const active = sort === s;
            return (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: active ? S.surface2 : "transparent",
                  color:      active ? S.text : S.muted,
                  boxShadow:  active ? `inset 0 0 0 1px ${S.teal}40` : undefined,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {SORT_LABELS[s].label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{ background: `${S.amber}15`, border: `1px solid ${S.amber}40`, color: S.amber }}
        >
          {error}
        </div>
      )}

      {/* Live-seksjon — vises kun hvis noen er live */}
      {liveCommunities.length > 0 && !query && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4" style={{ color: S.rose }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: S.text }}>
              Live nå
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: `${S.rose}20`, color: S.rose }}
            >
              {liveCommunities.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveCommunities.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                joining={joiningId === c.id}
                onJoin={() => void joinCommunity(c)}
                accent={S.rose}
              />
            ))}
          </div>
        </section>
      )}

      {/* Alle */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: S.text }}>
            {query ? `Søkeresultater (${communities.length})` : "Alle communities"}
          </h2>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: S.muted }} />}
        </div>

        {communities.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: S.surface, border: `1px solid ${S.line}` }}
          >
            <p className="text-sm" style={{ color: S.muted }}>
              {query ? `Ingen treff på "${query}".` : "Ingen communities ennå."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                joining={joiningId === c.id}
                onJoin={() => void joinCommunity(c)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CommunityCard({
  community: c, joining, onJoin, accent,
}: {
  community: Community;
  joining:   boolean;
  onJoin:    () => void;
  accent?:   string;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl transition-all hover:scale-[1.01]"
      style={{
        background: S.surface,
        border:     `1px solid ${accent ? `${accent}30` : S.line}`,
      }}
    >
      {/* Banner */}
      <Link href={`/c/${c.slug}`} className="relative block h-20 overflow-hidden" style={{ background: S.surface2 }}>
        {c.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${S.purple}20 0%, ${S.blue}20 100%)` }}
          />
        )}
        {c.isLive && (
          <span
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{ background: S.rose, color: "#fff", boxShadow: `0 0 12px ${S.rose}80` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.logoUrl}
              alt={c.name}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
              style={{ background: S.surface2 }}
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: S.surface2, color: S.muted }}
            >
              {c.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Link href={`/c/${c.slug}`} className="block">
              <h3 className="truncate text-sm font-semibold transition-colors hover:opacity-80" style={{ color: S.text }}>
                {c.name}
              </h3>
            </Link>
            <p className="flex items-center gap-1 text-xs" style={{ color: S.subtle }}>
              <Users className="h-3 w-3" />
              {c.memberCount.toLocaleString("no-NO")} medlem{c.memberCount === 1 ? "" : "mer"}
            </p>
          </div>
        </div>

        {c.description && (
          <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: S.muted }}>
            {c.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {c.requiresFanpass && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: `${S.purple}15`, color: S.purple, border: `1px solid ${S.purple}30` }}
            >
              <Crown className="h-2.5 w-2.5" />
              Fanpass kreves
            </span>
          )}
          {c.joinType === "CLOSED" && !c.requiresFanpass && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: `${S.amber}15`, color: S.amber, border: `1px solid ${S.amber}30` }}
            >
              Lukket
            </span>
          )}
        </div>

        {/* Action */}
        <button
          onClick={onJoin}
          disabled={joining || c.hasPendingRequest}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: c.isMember || c.hasPendingRequest ? S.surface2 : S.teal,
            color:      c.isMember || c.hasPendingRequest ? S.text     : S.bg,
            border:     c.isMember || c.hasPendingRequest ? `1px solid ${S.line}` : "none",
          }}
        >
          {joining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : c.isMember ? (
            "Åpne →"
          ) : c.hasPendingRequest ? (
            "Venter på svar…"
          ) : c.requiresFanpass ? (
            <>
              <Crown className="h-3.5 w-3.5" />
              Aktiver Fanpass
            </>
          ) : c.joinType === "CLOSED" ? (
            "Forespør om å bli med"
          ) : (
            "Bli medlem"
          )}
        </button>
      </div>
    </div>
  );
}
