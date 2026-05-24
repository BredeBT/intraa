"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, FileText, MessageSquare, MessageCircle, Loader2, X } from "lucide-react";

type Hit =
  | {
      type: "post";
      id: string;
      snippet: string;
      createdAt: string;
      author: { id: string; name: string | null; avatarUrl: string | null };
      orgSlug: string;
      orgName: string;
    }
  | {
      type: "message";
      id: string;
      snippet: string;
      createdAt: string;
      author: { id: string; name: string | null; avatarUrl: string | null };
      channelId: string;
      channelName: string;
      orgSlug: string;
      orgName: string;
    }
  | {
      type: "dm";
      id: string;
      snippet: string;
      createdAt: string;
      otherUser: { id: string; name: string | null; avatarUrl: string | null };
      outgoing: boolean;
    };

type FilterType = "all" | "post" | "message" | "dm";

const S = {
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
} as const;

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "nå";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} d siden`;
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

/** Marker første forekomst av query med highlight. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  // Vis ~40 tegn rundt treffet
  const start = Math.max(0, idx - 40);
  const end   = Math.min(text.length, idx + q.length + 100);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const before = text.slice(start, idx);
  const match  = text.slice(idx, idx + q.length);
  const after  = text.slice(idx + q.length, end);
  return (
    <>
      {prefix}{before}
      <mark style={{ background: `${S.teal}30`, color: S.text, padding: "0 2px", borderRadius: 2 }}>{match}</mark>
      {after}{suffix}
    </>
  );
}

export default function SoekPage() {
  const [query,   setQuery]   = useState("");
  const [filter,  setFilter]  = useState<FilterType>("all");
  const [hits,    setHits]    = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search/content?q=${encodeURIComponent(query.trim())}`);
        if (r.ok) {
          const data = await r.json() as { hits: Hit[] };
          setHits(data.hits);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtered = filter === "all" ? hits : hits.filter((h) => h.type === filter);
  const counts = {
    all:     hits.length,
    post:    hits.filter((h) => h.type === "post").length,
    message: hits.filter((h) => h.type === "message").length,
    dm:      hits.filter((h) => h.type === "dm").length,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      <h1 className="mb-2 text-2xl md:text-3xl font-bold" style={{ color: S.text }}>Søk</h1>
      <p className="mb-6 text-sm" style={{ color: S.muted }}>
        Søk gjennom innlegg, kanal-meldinger og DM-er.
      </p>

      {/* Search field */}
      <div
        className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 transition-colors focus-within:ring-2"
        style={{
          background: S.surface,
          border:     `1px solid ${S.line}`,
        }}
      >
        <Search className="h-5 w-5 shrink-0" style={{ color: S.subtle }} />
        <input
          autoFocus
          type="text"
          placeholder="Skriv minst 2 tegn…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
          style={{ color: S.text }}
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: S.muted }} />}
        {query && !loading && (
          <button onClick={() => setQuery("")} className="rounded-full p-0.5 transition-colors hover:bg-white/[0.06]">
            <X className="h-4 w-4" style={{ color: S.subtle }} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      {hits.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {([
            { id: "all",     label: "Alt",        n: counts.all },
            { id: "post",    label: "Innlegg",    n: counts.post },
            { id: "message", label: "Meldinger",  n: counts.message },
            { id: "dm",      label: "DM",         n: counts.dm },
          ] as { id: FilterType; label: string; n: number }[]).map((f) => {
            const active = filter === f.id;
            const disabled = f.n === 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                disabled={disabled}
                className="rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: active ? S.teal : S.surface2,
                  color:      active ? "var(--bg-primary)" : S.muted,
                  border:     `1px solid ${active ? S.teal : S.line}`,
                }}
              >
                {f.label} <span style={{ opacity: 0.6 }}>{f.n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {query.trim().length < 2 ? (
        <p className="mt-8 text-center text-sm" style={{ color: S.subtle }}>
          Begynn å skrive for å søke.
        </p>
      ) : searched && hits.length === 0 ? (
        <div
          className="mt-4 rounded-xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <Search className="mx-auto mb-3 h-7 w-7" style={{ color: S.subtle }} />
          <p className="text-sm font-medium" style={{ color: S.text }}>
            Ingen treff på «{query}».
          </p>
          <p className="mt-1 text-xs" style={{ color: S.muted }}>
            Prøv et annet søkeord eller sjekk stavingen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => <ResultRow key={`${h.type}-${h.id}`} hit={h} q={query.trim()} />)}
        </div>
      )}
    </div>
  );
}

function ResultRow({ hit, q }: { hit: Hit; q: string }) {
  const meta = (() => {
    if (hit.type === "post") {
      return {
        Icon:  FileText,
        accent: S.blue,
        title: `${hit.author.name ?? "Ukjent"} i ${hit.orgName}`,
        href:  `/${hit.orgSlug}/feed`,
        kind:  "Innlegg",
      };
    }
    if (hit.type === "message") {
      return {
        Icon:  MessageSquare,
        accent: S.purple,
        title: `${hit.author.name ?? "Ukjent"} i #${hit.channelName}`,
        href:  `/meldinger?channelId=${hit.channelId}`,
        kind:  hit.orgName,
      };
    }
    return {
      Icon:  MessageCircle,
      accent: S.pink,
      title: hit.outgoing ? `Du → ${hit.otherUser.name ?? "Ukjent"}` : `${hit.otherUser.name ?? "Ukjent"} → Deg`,
      href:  `/meldinger?userId=${hit.otherUser.id}`,
      kind:  "DM",
    };
  })();

  const { Icon, accent, title, href, kind } = meta;

  return (
    <Link
      href={href}
      className="flex gap-3 rounded-xl p-4 transition-all hover:scale-[1.005]"
      style={{
        background: S.surface,
        border:     `1px solid ${S.line}`,
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <p className="truncate text-sm font-medium" style={{ color: S.text }}>{title}</p>
          <span className="shrink-0 text-[10px] uppercase tracking-wider" style={{ color: S.subtle }}>
            {kind}
          </span>
          <span className="ml-auto shrink-0 text-[10px]" style={{ color: S.subtle }}>
            {relativeDate(hit.createdAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: S.muted }}>
          <Highlight text={hit.snippet} q={q} />
        </p>
      </div>
    </Link>
  );
}
