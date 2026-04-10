"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Search, Radio, Users, UserPlus, Check, X, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id:          string;
  slug:        string;
  name:        string;
  description?: string | null;
  memberCount: number;
  isLive:      boolean;
  logoUrl:     string | null;
  bannerUrl:   string | null;
}

interface Friend {
  friendshipId: string;
  friend: { id: string; name: string | null; avatarUrl: string | null; status: string | null };
}

interface PendingRequest {
  id:     string;
  sender: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
}

interface Props {
  userName:               string;
  myCommunities:          Community[];
  recommendedCommunities: Community[];
  friends:                Friend[];
  pendingRequests:        PendingRequest[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ avatarUrl, name, size = 8 }: { avatarUrl: string | null; name: string | null; size?: number }) {
  const sizeClass = `h-${size} w-${size}`;
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

// ─── Community Card ───────────────────────────────────────────────────────────

function CommunityCard({ c, compact = false }: { c: Community; compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href={`/c/${c.slug}`}
        className="flex shrink-0 w-44 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700"
      >
        <div
          className="h-20 w-full"
          style={c.bannerUrl
            ? { backgroundImage: `url(${c.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }
          }
        />
        <div className="p-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="-mt-7 mb-2 h-9 w-9 rounded-lg border-2 border-zinc-900 object-cover" />
          ) : (
            <div className="-mt-7 mb-2 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-zinc-900 bg-indigo-600 text-xs font-bold text-white">
              {c.name[0]}
            </div>
          )}
          <p className="truncate text-xs font-semibold text-white">{c.name}</p>
          <div className="mt-1 flex items-center gap-2">
            {c.isLive && (
              <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
            )}
            <span className="text-[10px] text-zinc-500">{c.memberCount} med.</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div
        className="h-24 w-full"
        style={c.bannerUrl
          ? { backgroundImage: `url(${c.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }
        }
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="-mt-9 h-12 w-12 rounded-xl border-2 border-zinc-900 object-cover" />
          ) : (
            <div className="-mt-9 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-900 bg-indigo-600 text-lg font-bold text-white">
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
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{c.description}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Users className="h-3.5 w-3.5" /> {c.memberCount} medlemmer
          </span>
          <Link
            href={`/c/${c.slug}`}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-80"
          >
            Se community <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient({ userName, myCommunities, recommendedCommunities, friends, pendingRequests: initialRequests }: Props) {
  const [search,      setSearch]   = useState("");
  const [results,     setResults]  = useState<Community[] | null>(null);
  const [searching,   setSearching] = useState(false);
  const [requests,    setRequests]  = useState(initialRequests);
  const [, start]                  = useTransition();

  // Search communities
  useEffect(() => {
    if (!search.trim()) { setResults(null); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/discover/communities?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json() as { communities: Community[] };
        setResults(data.communities);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
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

  const displayed = results ?? recommendedCommunities;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header search */}
        <div className="mb-8 text-center">
          {myCommunities.length === 0 ? (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">Velkommen til Intraa{userName ? `, ${userName}` : ""}!</h1>
              <p className="mb-5 text-sm text-zinc-500">Finn et community å bli med i</p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">Finn ditt community</h1>
              <p className="mb-5 text-sm text-zinc-500">Opplev fellesskap, creators og communities</p>
            </>
          )}
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk etter communities…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* LEFT column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* My communities */}
            {myCommunities.length > 0 && !search && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white">Mine communities</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {myCommunities.map((c) => (
                    <CommunityCard key={c.id} c={c} compact />
                  ))}
                </div>
              </section>
            )}

            {/* Recommended / search results */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">
                {search ? `Resultater for «${search}»` : "Anbefalte communities"}
                {searching && <span className="ml-2 text-xs font-normal text-zinc-500">Søker…</span>}
              </h2>
              {displayed.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
                  <p className="text-sm text-zinc-500">Ingen communities funnet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {displayed.map((c) => <CommunityCard key={c.id} c={c} />)}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT column */}
          <aside className="hidden w-72 shrink-0 space-y-4 lg:block">
            {/* Pending requests */}
            {requests.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Venneforespørsler ({requests.length})
                </h2>
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5">
                      <Avatar avatarUrl={r.sender.avatarUrl} name={r.sender.name} />
                      <div className="flex-1 min-w-0">
                        <Link href={r.sender.id ? `/u/${r.sender.id}` : "#"}
                          className="truncate text-xs font-medium text-white hover:text-indigo-400">
                          {r.sender.name ?? "Ukjent"}
                        </Link>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => respondToRequest(r.id, "accept")}
                          className="rounded-md bg-indigo-600/20 p-1.5 text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
                          title="Godta"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => respondToRequest(r.id, "decline")}
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
            )}

            {/* Friends online */}
            {friends.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
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
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friends.length === 0 && requests.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 py-8 text-center">
                <UserPlus className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                <p className="text-xs text-zinc-500">Finn venner ved å besøke profiler i communities</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
