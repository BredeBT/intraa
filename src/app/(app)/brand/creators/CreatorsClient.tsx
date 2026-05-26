"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Send, ChevronLeft } from "lucide-react";
import { CREATOR_TAGS, TAG_BY_SLUG } from "@/lib/creatorTags";

interface Creator {
  id:        string;
  name:      string | null;
  username:  string;
  avatarUrl: string | null;
  bio:       string | null;
  tags:      string[];
  communities: { id: string; name: string; slug: string; memberCount: number }[];
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
  blue:     "#60A5FA",
} as const;

export default function CreatorsClient({
  initial, sponsorBrandName,
}: {
  initial:          Creator[];
  sponsorBrandName: string;
}) {
  const [creators,      setCreators]      = useState<Creator[]>(initial);
  const [query,         setQuery]         = useState("");
  const [activeTags,    setActiveTags]    = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [reachOutTo,    setReachOutTo]    = useState<Creator | null>(null);
  const initialMount = useRef(true);

  // Re-fetch ved query/tag-endring (skip initial)
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
        if (activeTags.length > 0) params.set("tags", activeTags.join(","));
        const r = await fetch(`/api/creators/search?${params}`);
        if (r.ok) {
          const data = await r.json() as { creators: Creator[] };
          setCreators(data.creators);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, activeTags]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/brand/dashboard"
          className="inline-flex items-center gap-1.5 text-xs mb-3 hover:opacity-80"
          style={{ color: S.muted }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Tilbake til dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: S.text }}>
          Finn creators
        </h1>
        <p className="mt-1 text-sm" style={{ color: S.muted }}>
          Browse creators på Intraa og ta direkte kontakt for samarbeid som <strong>{sponsorBrandName}</strong>.
        </p>
      </div>

      {/* Søkefelt */}
      <div className="mb-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: S.subtle }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter navn eller brukernavn…"
          className="w-full rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none"
          style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.text }}
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

      {/* Tag-filter */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: S.subtle }}>
          Filtrer på kategori
        </p>
        <div className="flex flex-wrap gap-2">
          {CREATOR_TAGS.map((tag) => {
            const active = activeTags.includes(tag.slug);
            return (
              <button
                key={tag.slug}
                onClick={() => {
                  setActiveTags(active ? activeTags.filter((t) => t !== tag.slug) : [...activeTags, tag.slug]);
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: active ? `${S.teal}15` : S.surface,
                  color:      active ? S.teal       : S.muted,
                  border:     `1px solid ${active ? `${S.teal}40` : S.line}`,
                }}
              >
                <span>{tag.emoji}</span>
                {tag.label}
              </button>
            );
          })}
        </div>
        {activeTags.length > 0 && (
          <button
            onClick={() => setActiveTags([])}
            className="mt-2 text-xs underline opacity-60 hover:opacity-100"
            style={{ color: S.muted }}
          >
            Tøm filter
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: S.subtle }}>
          {creators.length} creator{creators.length === 1 ? "" : "s"}
        </p>
        {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: S.muted }} />}
      </div>

      {creators.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <p className="text-sm font-medium" style={{ color: S.text }}>Ingen creators matcher.</p>
          <p className="mt-1 text-xs" style={{ color: S.muted }}>Prøv færre tagger eller annet søkeord.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c) => (
            <CreatorCard key={c.id} creator={c} onReachOut={() => setReachOutTo(c)} />
          ))}
        </div>
      )}

      {/* Reach-out modal */}
      {reachOutTo && (
        <ReachOutModal creator={reachOutTo} onClose={() => setReachOutTo(null)} />
      )}
    </div>
  );
}

function CreatorCard({ creator, onReachOut }: { creator: Creator; onReachOut: () => void }) {
  const initials = (creator.name ?? creator.username).slice(0, 2).toUpperCase();
  return (
    <div
      className="flex flex-col rounded-2xl p-4 transition-all hover:scale-[1.01]"
      style={{ background: S.surface, border: `1px solid ${S.line}` }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        {creator.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: S.surface2, color: S.muted }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/u/${creator.username}`}
            className="block truncate text-sm font-semibold hover:opacity-80"
            style={{ color: S.text }}
          >
            {creator.name ?? creator.username}
          </Link>
          <p className="truncate text-xs" style={{ color: S.subtle }}>@{creator.username}</p>
        </div>
      </div>

      {/* Bio */}
      {creator.bio && (
        <p className="mb-3 text-xs leading-relaxed line-clamp-2" style={{ color: S.muted }}>
          {creator.bio}
        </p>
      )}

      {/* Tags */}
      {creator.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {creator.tags.map((slug) => {
            const tag = TAG_BY_SLUG[slug];
            if (!tag) return null;
            return (
              <span
                key={slug}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: S.surface2, color: S.muted }}
              >
                {tag.emoji} {tag.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Communities */}
      {creator.communities.length > 0 && (
        <div className="mb-4 text-xs" style={{ color: S.subtle }}>
          Driver {creator.communities.length} community
          {creator.communities.length === 1 ? "" : "er"} ({creator.communities.reduce((sum, c) => sum + c.memberCount, 0).toLocaleString("no-NO")} medl.)
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onReachOut}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity"
        style={{ background: S.purple, color: "#fff" }}
      >
        <Send className="h-3.5 w-3.5" />
        Send henvendelse
      </button>
    </div>
  );
}

function ReachOutModal({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/sponsor/threads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creatorId: creator.id, subject, message }),
      });
      const data = await r.json() as { ok?: boolean; threadId?: string; error?: string; alreadyHasThread?: boolean };
      if (!r.ok || !data.ok) {
        setError(data.error ?? "Noe gikk galt");
        setSending(false);
        return;
      }
      if (data.threadId) router.push(`/brand/innboks/${data.threadId}`);
    } catch {
      setError("Noe gikk galt — prøv igjen");
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: S.surface, border: `1px solid ${S.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/[0.06]">
          <X className="h-4 w-4" style={{ color: S.muted }} />
        </button>

        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: S.purple }}>Ny henvendelse</p>
        <h2 className="text-lg font-bold mb-4" style={{ color: S.text }}>
          Til {creator.name ?? creator.username}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: S.muted }}>Emne</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="F.eks. Sommer-kampanje 2026"
              maxLength={120}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: S.surface2, border: `1px solid ${S.line}`, color: S.text }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: S.muted }}>Melding</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Beskriv kampanjen, budsjett-rammer, hva du ser etter…"
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: S.surface2, border: `1px solid ${S.line}`, color: S.text }}
            />
            <p className="mt-1 text-right text-xs" style={{ color: S.subtle }}>{message.length}/2000</p>
          </div>
          {error && <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>}
          <button
            onClick={() => void submit()}
            disabled={sending || !subject.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: S.purple, color: "#fff" }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send henvendelse
          </button>
        </div>
      </div>
    </div>
  );
}
