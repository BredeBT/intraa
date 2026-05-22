"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart3, Gift, Plus, Users, Eye, Clock, Award, Send, Trophy,
  X, Loader2, Crown,
} from "lucide-react";
import LivePollOverlay     from "./LivePollOverlay";
import LiveGiveawayOverlay from "./LiveGiveawayOverlay";
import StreamChat          from "./StreamChat";

interface PollHistory {
  id:         string;
  question:   string;
  options:    { id: string; label: string; votes: number }[];
  totalVotes: number;
  createdAt:  string;
  closedAt:   string | null;
}

interface GiveawayHistory {
  id:          string;
  title:       string;
  prize:       string;
  status:      "COMPLETED" | "CANCELLED";
  entryCount:  number;
  winner:      { id: string; name: string | null; username: string; avatarUrl: string | null } | null;
  createdAt:   string;
  completedAt: string | null;
}

interface Props {
  orgId:        string;
  userId:       string;
  embedSrc:     string | null;
  twitchChat:   string | null;
  viewerCount:  number;
  streamTitle:  string;
  liveSince:    Date | null;
  onClose:      () => void;
  onOpenPoll:     () => void;
  onOpenGiveaway: () => void;
}

function fmtDur(ms: number) {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}t ${m}min`;
  return `${m} min`;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60_000);
  if (m < 1)  return "nå";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  const d = Math.floor(h / 24);
  return `${d} dag${d === 1 ? "" : "er"} siden`;
}

export default function StreamStudio({
  orgId, userId, embedSrc, twitchChat,
  viewerCount, streamTitle, liveSince,
  onClose, onOpenPoll, onOpenGiveaway,
}: Props) {
  const [polls,     setPolls]     = useState<PollHistory[]>([]);
  const [giveaways, setGiveaways] = useState<GiveawayHistory[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dmWinner,  setDmWinner]  = useState<GiveawayHistory["winner"] | null>(null);
  const [uptime,    setUptime]    = useState("—");

  // Live uptime tick
  useEffect(() => {
    if (!liveSince) return;
    function tick() {
      setUptime(fmtDur(Date.now() - liveSince!.getTime()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveSince]);

  // Fetch history
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/live/history?orgId=${orgId}`);
        if (!res.ok) return;
        const data = await res.json() as { polls: PollHistory[]; giveaways: GiveawayHistory[] };
        if (!cancelled) {
          setPolls(data.polls);
          setGiveaways(data.giveaways);
          setLoading(false);
        }
      } catch { /* silent */ }
    }
    void load();
    const id = setInterval(load, 20_000); // refresh every 20s
    return () => { cancelled = true; clearInterval(id); };
  }, [orgId]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "#050816" }}>

      {/* Studio header */}
      <div
        className="flex shrink-0 items-center gap-3 px-5 py-3 border-b"
        style={{
          background:  "linear-gradient(90deg, rgba(168,85,247,0.10), rgba(96,165,250,0.06))",
          borderColor: "rgba(168,85,247,0.30)",
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg, #A855F7, #F472B6)", color: "#fff" }}
        >
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#A855F7" }}>
            Creator Studio
          </p>
          <p className="text-sm font-semibold text-white truncate max-w-md">{streamTitle}</p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Stat icon={<Eye  className="h-3.5 w-3.5" />} value={viewerCount.toLocaleString("no-NO")} label="seere"  color="#5EEAD4" />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} value={uptime}                            label="uptime" color="#A855F7" />
          <button
            onClick={onClose}
            className="ml-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
            style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <X className="h-3.5 w-3.5" /> Lukk Studio
          </button>
        </div>
      </div>

      {/* Body: 2-column grid */}
      <div className="flex flex-1 min-h-0">

        {/* Left col: PIP stream + mini-chat */}
        <div className="flex flex-col shrink-0 w-[28%] min-w-[320px] border-r border-white/[0.06]">
          {/* PIP stream */}
          <div className="aspect-video bg-black shrink-0">
            {embedSrc
              ? <iframe src={embedSrc} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen" title="Stream" />
              : <div className="flex h-full items-center justify-center text-zinc-700 text-xs">Ingen stream</div>
            }
          </div>

          {/* Quick actions */}
          <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-b border-white/[0.06]">
            <button
              onClick={onOpenPoll}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.30)" }}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Ny avstemning
            </button>
            <button
              onClick={onOpenGiveaway}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.30)" }}
            >
              <Gift className="h-3.5 w-3.5" /> Ny giveaway
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {twitchChat
              ? <iframe src={twitchChat} className="h-full w-full" title="Twitch Chat" />
              : <StreamChat orgId={orgId} userId={userId} disabled={false} />
            }
          </div>
        </div>

        {/* Right col: scrollable workspace */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Active now */}
          <section>
            <SectionHeader title="Aktivt nå" subtitle="Live avstemninger og giveaways" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="empty:hidden">
                <LivePollOverlay orgId={orgId} isAdmin={true} />
              </div>
              <div className="empty:hidden">
                <LiveGiveawayOverlay orgId={orgId} isAdmin={true} />
              </div>
            </div>
          </section>

          {/* Poll history */}
          <section>
            <SectionHeader title="Tidligere avstemninger" subtitle="Resultater fra avsluttede polls" />
            {loading ? (
              <p className="text-xs text-white/40">Henter…</p>
            ) : polls.length === 0 ? (
              <EmptyCard icon={<BarChart3 className="h-5 w-5" />} text="Ingen avstemninger ennå. Trykk Ny avstemning for å starte." />
            ) : (
              <div className="space-y-2">
                {polls.map((p) => <PollHistoryCard key={p.id} poll={p} />)}
              </div>
            )}
          </section>

          {/* Giveaway history */}
          <section>
            <SectionHeader title="Tidligere giveaways" subtitle="Send DM til vinnere fra her" />
            {loading ? (
              <p className="text-xs text-white/40">Henter…</p>
            ) : giveaways.length === 0 ? (
              <EmptyCard icon={<Gift className="h-5 w-5" />} text="Ingen giveaways ennå. Start din første!" />
            ) : (
              <div className="space-y-2">
                {giveaways.map((g) => (
                  <GiveawayHistoryCard
                    key={g.id}
                    giveaway={g}
                    onDmWinner={() => g.winner && setDmWinner(g.winner)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* DM Winner modal */}
      {dmWinner && (
        <DmWinnerModal
          winner={dmWinner}
          onClose={() => setDmWinner(null)}
        />
      )}
    </div>
  );
}

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white tabular-nums">{value}</p>
        <p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/60">{title}</p>
      {subtitle && <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="rounded-2xl py-6 px-4 text-center"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
        {icon}
      </div>
      <p className="text-xs text-white/40">{text}</p>
    </div>
  );
}

function PollHistoryCard({ poll }: { poll: PollHistory }) {
  const [expanded, setExpanded] = useState(false);
  const winner = poll.options[0];

  return (
    <div
      className="rounded-xl p-3 cursor-pointer transition-colors hover:bg-white/[0.04]"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>
          <BarChart3 className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{poll.question}</p>
          <p className="text-[10px] text-white/40 mt-0.5">
            {poll.totalVotes} {poll.totalVotes === 1 ? "stemme" : "stemmer"} ·
            Vinner: <span className="text-white/70">{winner?.label ?? "Ingen"}</span> ·
            {" "}{relTime(poll.createdAt)}
          </p>
        </div>
        <span className="text-[10px] text-white/30">{expanded ? "Skjul" : "Detaljer"}</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {poll.options.map((o) => {
            const pct = poll.totalVotes > 0 ? (o.votes / poll.totalVotes) * 100 : 0;
            const isWinner = o.id === winner?.id;
            return (
              <div
                key={o.id}
                className="relative overflow-hidden rounded-lg px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border:     isWinner ? "1px solid rgba(168,85,247,0.45)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${pct}%`, background: isWinner ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.05)" }}
                />
                <div className="relative flex items-center justify-between text-xs">
                  <span className={isWinner ? "font-semibold text-white" : "text-white/70"}>{o.label}</span>
                  <span className="font-mono text-white/60">{Math.round(pct)}% · {o.votes}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GiveawayHistoryCard({ giveaway, onDmWinner }: { giveaway: GiveawayHistory; onDmWinner: () => void }) {
  const cancelled = giveaway.status === "CANCELLED";
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: cancelled ? "rgba(255,255,255,0.02)" : "rgba(251,191,36,0.04)",
        border:     `1px solid ${cancelled ? "rgba(255,255,255,0.06)" : "rgba(251,191,36,0.20)"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{
          background: cancelled ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.15)",
          color:      cancelled ? "rgba(255,255,255,0.4)" : "#FBBF24",
        }}>
          {cancelled ? <X className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{giveaway.title}</p>
          <p className="text-[11px] text-white/60 mt-0.5">🎁 {giveaway.prize}</p>
          <p className="text-[10px] text-white/40 mt-1">
            {giveaway.entryCount} {giveaway.entryCount === 1 ? "deltaker" : "deltakere"} ·
            {" "}{relTime(giveaway.createdAt)}
            {cancelled && " · Kansellert"}
          </p>
        </div>
      </div>

      {giveaway.winner && (
        <div className="mt-3 flex items-center gap-3 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div
            className="h-8 w-8 shrink-0 rounded-full"
            style={{
              background: giveaway.winner.avatarUrl
                ? `url(${giveaway.winner.avatarUrl}) center/cover`
                : "linear-gradient(135deg, #FBBF24, #A855F7)",
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
              <Award className="h-3 w-3" style={{ color: "#FBBF24" }} />
              {giveaway.winner.name ?? giveaway.winner.username}
            </p>
            <p className="text-[10px] text-white/40">vant @{giveaway.winner.username}</p>
          </div>
          <button
            onClick={onDmWinner}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
          >
            <Send className="h-3 w-3" /> Send DM
          </button>
        </div>
      )}
    </div>
  );
}

function DmWinnerModal({
  winner, onClose,
}: {
  winner: { id: string; name: string | null; username: string; avatarUrl: string | null };
  onClose: () => void;
}) {
  const [text,    setText]    = useState(`Gratulerer ${winner.name?.split(" ")[0] ?? "med seieren"}! 🏆`);
  const [sending, setSending] = useState(false);
  const [, start] = useTransition();

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    start(async () => {
      try {
        await fetch(`/api/dm/${winner.id}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: text.trim() }),
        });
        onClose();
      } finally {
        setSending(false);
      }
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,22,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: "#0B1027", border: "1px solid rgba(94,234,212,0.30)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-10 w-10 shrink-0 rounded-full"
            style={{
              background: winner.avatarUrl
                ? `url(${winner.avatarUrl}) center/cover`
                : "linear-gradient(135deg, #5EEAD4, #A855F7)",
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{winner.name ?? winner.username}</p>
            <p className="text-[11px] text-white/50">Send melding til vinner</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          className="w-full rounded-lg bg-white/[0.05] border border-white/[0.10] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-teal-500/40 resize-none"
          placeholder="Hei, gratulerer med seieren!"
        />

        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs text-white/60 hover:text-white"
          >
            Avbryt
          </button>
          <button
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send melding
          </button>
        </div>

        <p className="mt-3 text-[10px] text-white/30 text-center">
          <Crown className="inline h-2.5 w-2.5 mr-1" /> Dere må være venner for at meldingen skal komme frem
        </p>
      </div>
    </div>
  );
}
