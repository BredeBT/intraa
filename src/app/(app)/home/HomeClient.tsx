"use client";

import { useState, useTransition, useEffect, CSSProperties } from "react";
import Link from "next/link";
import { Search, Radio, Users, Check, X, ArrowRight, MessageSquare } from "lucide-react";

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

interface Friend {
  friendshipId: string;
  friend: { id: string; name: string | null; avatarUrl: string | null; username: string | null; status: string | null };
}

interface PendingRequest {
  id:     string;
  sender: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
}

type ActivityItem =
  | { type: "post";   createdAt: string; authorName: string | null; authorAvatar: string | null; orgName: string; orgSlug: string; preview: string }
  | { type: "member"; createdAt: string; authorName: string | null; authorAvatar: string | null; orgName: string };

interface Props {
  userName:               string;
  myCommunities:          Community[];
  recommendedCommunities: Community[];
  friends:                Friend[];
  pendingRequests:        PendingRequest[];
  activity:               ActivityItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "nå";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t`;
  return `${Math.floor(h / 24)}d`;
}

function fadeStyle(delay: number): CSSProperties {
  return { animation: `fadeInUp 0.4s ease both`, animationDelay: `${delay}ms` };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  name,
  size = 8,
}: {
  avatarUrl: string | null;
  name: string | null;
  size?: number;
}) {
  const sz = `h-${size} w-${size}`;
  if (avatarUrl)
    return <img src={avatarUrl} alt="" className={`${sz} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

// ─── Rich Community Card ──────────────────────────────────────────────────────

function RichCommunityCard({ c, index }: { c: Community; index: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-violet-500/20 bg-zinc-900 card-lift"
      style={fadeStyle(index * 60)}
    >
      {/* Banner — no logo overlap, clean top */}
      <div
        className="relative w-full"
        style={{
          height: 140,
          backgroundSize: "cover",
          backgroundPosition: "top",
          ...(c.bannerUrl
            ? { backgroundImage: `url(${c.bannerUrl})` }
            : { background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)" }),
        }}
      >
        {c.isLive && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        )}
      </div>

      {/* Body — logo below banner, no overlap */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="shrink-0">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-zinc-700 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-indigo-600 text-lg font-bold text-white">
                {c.name[0]}
              </div>
            )}
          </div>

          {/* Name + member count */}
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[18px] font-semibold leading-tight text-white">{c.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              <Users className="inline h-3 w-3 mr-0.5" />
              {c.memberCount.toLocaleString("no-NO")} medlemmer
            </p>
          </div>

          {/* CTA */}
          <Link
            href={`/${c.slug}/feed`}
            className="shrink-0 flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 btn-press"
          >
            Gå inn <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatBox label="Innlegg denne uken" value={c.postCount} />
          <StatBox label="Medlemmer" value={c.memberCount} />
          <StatBox label="Online nå" value={c.onlineCount} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-center">
      <p className="text-xl font-bold text-white">{value.toLocaleString("no-NO")}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{label}</p>
    </div>
  );
}

// ─── Compact Community Card (search results / recommended) ────────────────────

function CompactCommunityCard({ c }: { c: Community }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 card-lift">
      {/* Banner */}
      <div
        className="h-24 w-full"
        style={c.bannerUrl
          ? { backgroundImage: `url(${c.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "top" }
          : { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }
        }
      />
      <div className="p-3">
        <div className="flex items-center gap-2.5">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="h-10 w-10 rounded-lg border border-zinc-700 object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-indigo-600 text-base font-bold text-white">
              {c.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{c.name}</h3>
              {c.isLive && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <Radio className="h-2.5 w-2.5" /> LIVE
                </span>
              )}
            </div>
            {c.description && (
              <p className="truncate text-[11px] text-zinc-500">{c.description}</p>
            )}
            <p className="text-[10px] text-zinc-600">
              <Users className="inline h-2.5 w-2.5 mr-0.5" />
              {c.memberCount.toLocaleString("no-NO")} medlemmer
            </p>
          </div>
          <Link
            href={`/${c.slug}/feed`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-80"
          >
            Se community <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Stream ──────────────────────────────────────────────────────────

function ActivityStream({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, 5);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden" style={fadeStyle(100)}>
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Siste aktivitet</h2>
      </div>
      <div>
        {visible.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 1 ? "bg-zinc-800/20" : ""}`}
          >
            <Avatar avatarUrl={item.authorAvatar} name={item.authorName} size={7} />
            <div className="flex-1 min-w-0">
              {item.type === "post" ? (
                <p className="truncate text-xs text-zinc-300">
                  <span className="font-semibold text-white">{item.authorName ?? "Ukjent"}</span>
                  {" postet i "}
                  <Link href={`/${item.orgSlug}/feed`} className="text-violet-400 hover:underline">{item.orgName}</Link>
                </p>
              ) : (
                <p className="truncate text-xs text-zinc-300">
                  <span className="font-semibold text-white">{item.authorName ?? "Ukjent"}</span>
                  {" ble med i "}
                  <span className="text-violet-400">{item.orgName}</span>
                </p>
              )}
              {item.type === "post" && item.preview && (
                <p className="truncate text-[11px] text-zinc-600">{item.preview}</p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-zinc-600">{relTime(item.createdAt)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 px-4 py-2.5">
        <Link href="/feed" className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-violet-400">
          Se mer i feed <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Friends Online ───────────────────────────────────────────────────────────

function FriendsOnline({ friends }: { friends: Friend[] }) {
  const online = friends.filter((f) => f.friend.status === "online");
  if (online.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" style={fadeStyle(200)}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Online nå ({online.length})
      </h2>
      <div className="flex flex-wrap gap-3">
        {online.map(({ friendshipId, friend }) => (
          <Link
            key={friendshipId}
            href={`/u/${friend.username ?? friend.id}`}
            className="relative"
            title={friend.name ?? "Ukjent"}
          >
            <Avatar avatarUrl={friend.avatarUrl} name={friend.name} size={10} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900 bg-emerald-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Pending Requests ─────────────────────────────────────────────────────────

function PendingRequests({
  requests,
  onRespond,
}: {
  requests: PendingRequest[];
  onRespond: (id: string, action: "accept" | "decline") => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Venneforespørsler ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5">
            <Avatar avatarUrl={r.sender.avatarUrl} name={r.sender.name} />
            <Link
              href={`/u/${r.sender.id}`}
              className="flex-1 truncate text-xs font-medium text-white hover:text-indigo-400"
            >
              {r.sender.name ?? "Ukjent"}
            </Link>
            <div className="flex gap-1">
              <button
                onClick={() => onRespond(r.id, "accept")}
                className="rounded-md bg-indigo-600/20 p-1.5 text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
                title="Godta"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRespond(r.id, "decline")}
                className="rounded-md bg-zinc-800 p-1.5 text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient({
  userName,
  myCommunities,
  recommendedCommunities,
  friends,
  pendingRequests: initialRequests,
  activity,
}: Props) {
  const [search,    setSearch]    = useState("");
  const [results,   setResults]   = useState<Community[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [requests,  setRequests]  = useState(initialRequests);
  const [, start]                 = useTransition();

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

  const isSearching    = !!search.trim();
  const hasCommunities = myCommunities.length > 0;
  void userName; // used by parent for personalisation if needed

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* Search bar */}
        <div className="mb-6" style={fadeStyle(0)}>
          {!hasCommunities && (
            <p className="mb-3 text-center text-sm text-zinc-500">Finn et community å bli med i</p>
          )}
          <div className="mx-auto flex max-w-lg items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 focus-within:border-zinc-600 transition-colors">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Finn et nytt community…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
            />
            {searching && <span className="text-xs text-zinc-500">Søker…</span>}
          </div>
        </div>

        {/* Search results */}
        {isSearching && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-white">
              Resultater for «{search}»
            </h2>
            {results === null ? null : results.length === 0 ? (
              <p className="text-sm text-zinc-500">Ingen communities funnet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((c) => <CompactCommunityCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        )}

        {/* Main layout — hidden when searching */}
        {!isSearching && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* LEFT — communities + activity (takes 2/3 on desktop) */}
            <div className="lg:col-span-2 space-y-4">
              {hasCommunities ? (
                myCommunities.map((c, i) => (
                  <RichCommunityCard key={c.id} c={c} index={i} />
                ))
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center" style={fadeStyle(0)}>
                  <p className="text-sm text-zinc-400">Du er ikke med i noen communities ennå.</p>
                  <p className="mt-1 text-xs text-zinc-600">Bruk søket over for å finne noe du liker.</p>
                </div>
              )}

              {/* Recommended (only shown if no communities yet) */}
              {!hasCommunities && recommendedCommunities.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-white">Anbefalte communities</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {recommendedCommunities.slice(0, 6).map((c) => (
                      <CompactCommunityCard key={c.id} c={c} />
                    ))}
                  </div>
                </section>
              )}

              {/* Activity — below communities in left col on desktop, after friends on mobile */}
              <div className="hidden lg:block">
                <ActivityStream items={activity} />
              </div>
            </div>

            {/* RIGHT sidebar (1/3 on desktop, below everything on mobile) */}
            <div className="space-y-4">
              <PendingRequests requests={requests} onRespond={respondToRequest} />
              <FriendsOnline friends={friends} />

              {/* All friends list */}
              {friends.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" style={fadeStyle(150)}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Venner ({friends.length})
                  </h2>
                  <div className="space-y-2">
                    {friends.map(({ friendshipId, friend }) => (
                      <div key={friendshipId} className="flex items-center gap-2.5">
                        <div className="relative">
                          <Avatar avatarUrl={friend.avatarUrl} name={friend.name} />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${
                            friend.status === "online" ? "bg-emerald-400" : "bg-zinc-600"
                          }`} />
                        </div>
                        <span className="flex-1 truncate text-xs text-zinc-300">{friend.name ?? "Ukjent"}</span>
                        <Link
                          href={`/meldinger?userId=${friend.id}`}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                          title="Send melding"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile: activity last */}
              <div className="lg:hidden">
                <ActivityStream items={activity} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
