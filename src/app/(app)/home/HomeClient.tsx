"use client";

import { useState, useTransition, useEffect, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id:          string;
  slug:        string;
  name:        string;
  description?: string | null;
  memberCount: number;
  postCount:   number;
  onlineCount: number;
  isLive:      boolean;
  logoUrl:     string | null;
  bannerUrl:   string | null;
}

interface FriendItem {
  id:       string;
  name:     string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface PendingRequest {
  id:     string;
  sender: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
}

interface Props {
  userName:               string;
  myCommunities:          Community[];
  recommendedCommunities: Community[];
  friends:                FriendItem[];
  pendingRequests:        PendingRequest[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fadeStyle(delay: number): CSSProperties {
  return { animation: "fadeInUp 0.4s ease both", animationDelay: `${delay}ms` };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, name, size = 8 }: { avatarUrl: string | null; name: string | null; size?: number }) {
  const sz = `h-${size} w-${size}`;
  if (avatarUrl)
    return <img src={avatarUrl} alt="" className={`${sz} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

// ─── Compact Community Card ───────────────────────────────────────────────────

function CommunityCard({ c, index }: { c: Community; index: number }) {
  const router = useRouter();
  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/[0.06] hover:border-purple-500/30 transition-colors cursor-pointer"
      style={{ background: "#12121e", ...fadeStyle(index * 50) }}
      onClick={() => router.push(`/${c.slug}/feed`)}
    >
      {/* Banner */}
      <div
        className="h-[90px] md:h-[90px] relative"
        style={
          c.bannerUrl
            ? { backgroundImage: `url(${c.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(135deg, #4f35b8, #7c3aed)" }
        }
      >
        {c.isLive && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(220,38,38,0.9)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold text-white">LIVE</span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Logo */}
        {c.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-sm shrink-0 text-white">
            {c.name[0]}
          </div>
        )}

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{c.name}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {c.memberCount.toLocaleString("no-NO")} med.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 shrink-0">
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{c.postCount}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Innlegg</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-green-400">{c.onlineCount}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Online</p>
          </div>
        </div>

        {/* CTA */}
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors shrink-0"
          onClick={(e) => { e.stopPropagation(); router.push(`/${c.slug}/feed`); }}
        >
          Gå inn →
        </button>
      </div>
    </div>
  );
}

// ─── Friends panel ────────────────────────────────────────────────────────────

function FriendsPanel({ friends }: { friends: FriendItem[] }) {
  const router = useRouter();
  const onlineCount = friends.filter((f) => f.isOnline).length;

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: "#12121e" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
          Venner
        </span>
        {onlineCount > 0 && (
          <span className="text-[11px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
            {onlineCount} online
          </span>
        )}
      </div>

      {friends.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>Ingen venner ennå</p>
      ) : (
        <div>
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.05] last:border-0 cursor-pointer group"
              onClick={() => router.push(`/meldinger?userId=${friend.id}`)}
            >
              <div className="relative shrink-0">
                <Avatar avatarUrl={friend.avatarUrl} name={friend.name} size={8} />
                {friend.isOnline && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border-2 border-[#12121e]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/70 group-hover:text-white transition-colors truncate">
                  {friend.name ?? "Ukjent"}
                </p>
                {friend.isOnline
                  ? <p className="text-[11px] text-green-400">Online nå</p>
                  : <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>Offline</p>
                }
              </div>
              <span className="text-lg transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}>✉</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pending Requests ─────────────────────────────────────────────────────────

function PendingRequests({
  requests,
  onRespond,
}: {
  requests:  PendingRequest[];
  onRespond: (id: string, action: "accept" | "decline") => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: "#12121e" }}>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
        Venneforespørsler ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5">
            <Avatar avatarUrl={r.sender.avatarUrl} name={r.sender.name} />
            <Link href={`/u/${r.sender.id}`} className="flex-1 truncate text-xs font-medium text-white hover:text-purple-400 transition-colors">
              {r.sender.name ?? "Ukjent"}
            </Link>
            <div className="flex gap-1">
              <button
                onClick={() => onRespond(r.id, "accept")}
                className="rounded-md bg-purple-600/20 p-1.5 text-purple-400 transition-colors hover:bg-purple-600 hover:text-white"
                title="Godta"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRespond(r.id, "decline")}
                className="rounded-md p-1.5 transition-colors hover:bg-red-500/20 hover:text-red-400"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                title="Avslå"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Discovery Community Card (new-user view) ─────────────────────────────────

function DiscoveryCommunityCard({
  c,
  onJoin,
  joining,
}: {
  c:       Community;
  onJoin:  (id: string, slug: string) => void;
  joining: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border transition-colors" style={{ background: "#12121e", borderColor: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-28 w-full"
        style={c.bannerUrl
          ? { backgroundImage: `url(${c.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "top" }
          : { background: "linear-gradient(135deg, #4f35b8, #7c3aed)" }
        }
      />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ background: "#6c47ff" }}>
              {c.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white leading-tight truncate">{c.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {c.memberCount.toLocaleString("no-NO")} medlemmer · Åpent for alle
            </p>
          </div>
          <button
            onClick={() => onJoin(c.id, c.slug)}
            disabled={joining}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: "#6c47ff" }}
          >
            {joining ? "…" : "Bli med"}
          </button>
        </div>
        {c.description && (
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {c.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── New User Home ────────────────────────────────────────────────────────────

const STEPS = [
  { icon: "👥", title: "Bli med", text: "Finn et community og bli en del av fellesskapet" },
  { icon: "💬", title: "Chat",    text: "Snakk med andre medlemmer i sanntid" },
  { icon: "🎮", title: "Delta",   text: "Konkurranser, spill og mye mer venter" },
];

function NewUserHome({ communities }: { communities: Community[] }) {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [results,    setResults]    = useState<Community[] | null>(null);
  const [searching,  setSearching]  = useState(false);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!search.trim()) { setResults(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/discover/communities?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json() as { communities: Community[] };
        setResults(data.communities);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleJoin(id: string, slug: string) {
    setJoiningIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/org/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ orgId: id }),
      });
      if (res.ok) router.push(`/${slug}/feed`);
    } finally {
      setJoiningIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const displayList = search.trim() ? (results ?? []) : communities;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center py-6 px-4 mb-8" style={fadeStyle(0)}>
        <h1 className="text-2xl font-semibold text-white mb-2">Finn ditt community</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Bli med, chat og vær en del av fellesskapet
        </p>
        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.35)" }} />
          <input
            placeholder="Søk etter communities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", caretColor: "#a78bfa" }}
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Søker…
            </span>
          )}
        </div>
      </div>

      {search.trim() && results !== null && results.length === 0 ? (
        <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
          Ingen communities funnet for «{search}»
        </p>
      ) : (
        <div className="space-y-4 mb-8" style={fadeStyle(80)}>
          {search.trim() && (
            <p className="text-sm font-medium text-white mb-3">Resultater for «{search}»</p>
          )}
          {displayList.map((c) => (
            <DiscoveryCommunityCard key={c.id} c={c} onJoin={handleJoin} joining={joiningIds.has(c.id)} />
          ))}
        </div>
      )}

      {!search.trim() && (
        <div className="grid grid-cols-3 gap-3 mt-8" style={fadeStyle(160)}>
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-2xl mb-2">{step.icon}</div>
              <p className="text-sm font-medium text-white mb-1">{step.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{step.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient({
  myCommunities,
  recommendedCommunities,
  friends,
  pendingRequests: initialRequests,
}: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [, start]               = useTransition();

  void myCommunities; // used below

  function respondToRequest(id: string, action: "accept" | "decline") {
    start(async () => {
      await fetch("/api/friends/respond", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ friendshipId: id, action }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    });
  }

  if (myCommunities.length === 0) {
    return (
      <div className="min-h-screen" style={{ background: "#0d0d14" }}>
        <NewUserHome communities={recommendedCommunities} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "#0d0d14" }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">

          {/* ── Left — community list ── */}
          <div className="space-y-3" style={fadeStyle(0)}>
            {myCommunities.map((c, i) => (
              <CommunityCard key={c.id} c={c} index={i} />
            ))}
          </div>

          {/* ── Right — sidebar ── */}
          <div className="space-y-3" style={fadeStyle(80)}>
            <PendingRequests requests={requests} onRespond={respondToRequest} />
            <FriendsPanel friends={friends} />
          </div>

        </div>
      </div>
    </div>
  );
}
