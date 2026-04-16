"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Clock } from "lucide-react";

interface Member { id: string; name: string | null; avatarUrl: string | null }
interface Game {
  id:        string;
  status:    string;
  white:     Member;
  black:     Member;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moves:     any;
  updatedAt: Date | string;
}

interface Props {
  orgId:       string;
  orgSlug:     string;
  userId:      string;
  members:     Member[];
  activeGames: Game[];
}

function Avatar({ user, size = 8 }: { user: Member; size?: number }) {
  const cls = `h-${size} w-${size} rounded-full shrink-0`;
  if (user.avatarUrl)
    return <img src={user.avatarUrl} alt="" className={`${cls} object-cover`} />;  // eslint-disable-line @next/next/no-img-element
  return (
    <div className={`${cls} flex items-center justify-center bg-zinc-700 text-xs font-bold text-white`}>
      {(user.name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "akkurat nå";
  if (m < 60) return `${m}m siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  return `${Math.floor(h / 24)}d siden`;
}

export default function ChessLobby({ orgId, orgSlug, userId, members, activeGames }: Props) {
  const router  = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);

  const filtered = members.filter((m) =>
    !search || (m.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function startGame(opponentId: string) {
    setLoading(true);
    try {
      const res  = await fetch("/api/chess", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, opponentId }),
      });
      const data = await res.json() as { game: { id: string } };
      router.push(`/${orgSlug}/spill/sjakk/${data.game.id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">♟️ Sjakk</h1>
            <p className="text-sm text-white/40">Utfordre en venn</p>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ny kamp
          </button>
        </div>

        {/* Active games */}
        {activeGames.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Pågående kamper</p>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => {
                const isWhite  = g.white.id === userId;
                const opponent = isWhite ? g.black : g.white;
                const myColor  = isWhite ? "Hvit" : "Svart";
                const movesArr = g.moves as string[];
                const myTurn   = (movesArr.length % 2 === 0) === isWhite;
                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/${orgSlug}/spill/sjakk/${g.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
                  >
                    <Avatar user={opponent} size={10} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{opponent.name ?? "Ukjent"}</span>
                        <span className="text-[11px] text-white/40">{myColor}</span>
                        {myTurn && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Din tur</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-white/30">
                        <Clock className="h-3 w-3" />
                        {relTime(String(g.updatedAt))} · {movesArr.length} trekk
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">♟️</span>
            <p className="text-white/50 text-sm">Ingen aktive kamper</p>
            <p className="text-white/30 text-xs mt-1">Trykk «Ny kamp» for å utfordre noen</p>
          </div>
        )}
      </div>

      {/* Opponent picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Velg motstander</h2>
              <button onClick={() => setShowPicker(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                <Search className="h-4 w-4 text-white/30 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk etter navn…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-white/30">Ingen treff</p>
              )}
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setShowPicker(false); void startGame(m.id); }}
                  disabled={loading}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Avatar user={m} size={8} />
                  <span className="flex-1 text-sm text-white">{m.name ?? "Ukjent"}</span>
                  <span className="text-white/30 text-sm">Utfordre →</span>
                </button>
              ))}
            </div>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-emerald-500" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
