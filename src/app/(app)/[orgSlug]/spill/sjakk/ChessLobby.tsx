"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Clock, Check, X, Swords, Trophy } from "lucide-react";

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
interface ReceivedInvite { id: string; sender: Member }
interface SentInvite     { id: string; receiver: Member }
interface MyProfile      { rating: number; wins: number; losses: number; draws: number }
interface LeaderEntry    { user: Member; rating: number; wins: number; losses: number; draws: number }

interface Props {
  orgId:           string;
  orgSlug:         string;
  userId:          string;
  members:         Member[];
  activeGames:     Game[];
  receivedInvites: ReceivedInvite[];
  sentInvites:     SentInvite[];
  myProfile:       MyProfile;
  leaderboard:     LeaderEntry[];
}

function Avatar({ user, size = 8 }: { user: Member; size?: number }) {
  const cls = `h-${size} w-${size} rounded-full shrink-0`;
  if (user.avatarUrl)
    return <img src={user.avatarUrl} alt="" className={`${cls} object-cover`} />; // eslint-disable-line @next/next/no-img-element
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

function RatingBadge({ rating }: { rating: number }) {
  let color = "text-zinc-400";
  if (rating >= 1600) color = "text-amber-400";
  else if (rating >= 1400) color = "text-violet-400";
  else if (rating >= 1200) color = "text-emerald-400";
  return <span className={`text-xs font-bold ${color}`}>♟ {rating}</span>;
}

export default function ChessLobby({
  orgId, orgSlug, userId, members, activeGames,
  receivedInvites: initialReceived,
  sentInvites:     initialSent,
  myProfile,
  leaderboard,
}: Props) {
  const router = useRouter();
  const [showPicker,      setShowPicker]      = useState(false);
  const [search,          setSearch]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [inviteSent,      setInviteSent]      = useState<string | null>(null);
  const [receivedInvites, setReceivedInvites] = useState(initialReceived);
  const [sentInvites,     setSentInvites]     = useState(initialSent);
  const [actionLoading,   setActionLoading]   = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState<"kamper" | "rangering">("kamper");

  const totalGames = myProfile.wins + myProfile.losses + myProfile.draws;

  const filtered = members.filter((m) =>
    !search || (m.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Build a rating lookup for leaderboard entries to show in opponent picker
  const ratingMap = Object.fromEntries(leaderboard.map((e) => [e.user.id, e.rating]));

  async function sendInvite(opponentId: string, opponentName: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/chess", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, opponentId }),
      });
      if (res.ok) {
        setShowPicker(false);
        setInviteSent(opponentName ?? "motstanderen");
      }
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvite(inviteId: string) {
    setActionLoading(inviteId);
    try {
      const res  = await fetch(`/api/chess/invite/${inviteId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "accept" }),
      });
      const data = await res.json() as { game?: { id: string } };
      if (res.ok && data.game) {
        router.push(`/${orgSlug}/spill/sjakk/${data.game.id}`);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function declineInvite(inviteId: string) {
    setActionLoading(inviteId);
    try {
      await fetch(`/api/chess/invite/${inviteId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "decline" }),
      });
      setReceivedInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelInvite(inviteId: string) {
    setActionLoading(inviteId);
    try {
      await fetch(`/api/chess/invite/${inviteId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      setSentInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } finally {
      setActionLoading(null);
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
            onClick={() => { setShowPicker(true); setInviteSent(null); }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ny utfordring
          </button>
        </div>

        {/* My stats card */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{myProfile.rating}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Rating</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-1 justify-around text-center">
              <div>
                <p className="text-lg font-bold text-emerald-400">{myProfile.wins}</p>
                <p className="text-[11px] text-white/40">Vunnet</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-400">{myProfile.draws}</p>
                <p className="text-[11px] text-white/40">Remis</p>
              </div>
              <div>
                <p className="text-lg font-bold text-rose-400">{myProfile.losses}</p>
                <p className="text-[11px] text-white/40">Tapt</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{totalGames}</p>
                <p className="text-[11px] text-white/40">Kamper</p>
              </div>
            </div>
          </div>
          {totalGames > 0 && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex">
              {myProfile.wins   > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(myProfile.wins   / totalGames) * 100}%` }} />}
              {myProfile.draws  > 0 && <div className="h-full bg-zinc-500"    style={{ width: `${(myProfile.draws  / totalGames) * 100}%` }} />}
              {myProfile.losses > 0 && <div className="h-full bg-rose-500"    style={{ width: `${(myProfile.losses / totalGames) * 100}%` }} />}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
          {(["kamper", "rangering"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-colors ${
                activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab === "kamper" ? "Kamper" : "Rangering"}
            </button>
          ))}
        </div>

        {/* ── Tab: Kamper ── */}
        {activeTab === "kamper" && (
          <>
            {/* Invite sent confirmation */}
            {inviteSent && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                ✓ Utfordring sendt til <strong>{inviteSent}</strong>! Venter på svar.
              </div>
            )}

            {/* Received invites */}
            {receivedInvites.length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Utfordringer til deg</p>
                <div className="flex flex-col gap-2">
                  {receivedInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <Avatar user={inv.sender} size={10} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white text-sm">{inv.sender.name ?? "Ukjent"}</span>
                        {ratingMap[inv.sender.id] !== undefined && (
                          <RatingBadge rating={ratingMap[inv.sender.id]!} />
                        )}
                        <p className="text-xs text-white/40 mt-0.5">vil spille sjakk mot deg</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => void acceptInvite(inv.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" /> Godta
                        </button>
                        <button
                          onClick={() => void declineInvite(inv.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/30 disabled:opacity-50 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Avslå
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent invites */}
            {sentInvites.length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Ventende utfordringer</p>
                <div className="flex flex-col gap-2">
                  {sentInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <Avatar user={inv.receiver} size={10} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white text-sm">{inv.receiver.name ?? "Ukjent"}</span>
                        <p className="text-xs text-white/40 mt-0.5">Venter på svar…</p>
                      </div>
                      <button
                        onClick={() => void cancelInvite(inv.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" /> Kanseller
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Empty state */}
            {activeGames.length === 0 && receivedInvites.length === 0 && sentInvites.length === 0 && !inviteSent && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Swords className="h-12 w-12 mb-4 text-white/10" />
                <p className="text-white/50 text-sm">Ingen aktive kamper</p>
                <p className="text-white/30 text-xs mt-1">Trykk «Ny utfordring» for å utfordre noen</p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Rangering ── */}
        {activeTab === "rangering" && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Toppliste</p>
            {leaderboard.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">Ingen kamper spilt ennå</p>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry, idx) => {
                  const isMe    = entry.user.id === userId;
                  const games   = entry.wins + entry.losses + entry.draws;
                  const medal   = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                  return (
                    <div
                      key={entry.user.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        isMe
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-sm">
                        {medal ?? <span className="text-white/30 text-xs">{idx + 1}</span>}
                      </span>
                      <Avatar user={entry.user} size={8} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${isMe ? "text-emerald-300" : "text-white"} truncate`}>
                            {entry.user.name ?? "Ukjent"}
                          </span>
                          {isMe && <span className="text-[10px] text-white/40">(deg)</span>}
                        </div>
                        {games > 0 && (
                          <p className="text-[11px] text-white/30">
                            {entry.wins}V · {entry.draws}R · {entry.losses}T · {games} kamper
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <RatingBadge rating={entry.rating} />
                        {games === 0 && <p className="text-[10px] text-white/20 mt-0.5">Ingen kamper</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-white/30 leading-relaxed">
              <div className="flex items-center gap-2 mb-2 text-white/50">
                <Trophy className="h-3.5 w-3.5" />
                <span className="font-semibold">Elo-ratingsystem</span>
              </div>
              Startreting er 1200. Ratingen justeres etter hvert spill basert på styrkeforskjell —
              en seier mot sterk motstander gir mer enn mot svak.
              <span className="block mt-1">
                <span className="text-amber-400 font-semibold">Gull ≥ 1600</span> ·
                <span className="text-violet-400 font-semibold"> Sølv ≥ 1400</span> ·
                <span className="text-emerald-400 font-semibold"> Bronse ≥ 1200</span>
              </span>
            </div>
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
                  onClick={() => void sendInvite(m.id, m.name)}
                  disabled={loading}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Avatar user={m} size={8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{m.name ?? "Ukjent"}</p>
                    {ratingMap[m.id] !== undefined && (
                      <RatingBadge rating={ratingMap[m.id]!} />
                    )}
                  </div>
                  <span className="text-white/30 text-sm shrink-0">Utfordre →</span>
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
