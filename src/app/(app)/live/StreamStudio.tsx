"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart3, Gift, Users, Eye, Clock, Award, Send, Trophy,
  X, Loader2, Crown,
} from "lucide-react";
import LivePollOverlay     from "./LivePollOverlay";
import LiveGiveawayOverlay from "./LiveGiveawayOverlay";
import StreamChat          from "./StreamChat";
import { PollForm, GiveawayForm } from "./LiveAdminFAB";

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
  onOpenPoll?:     () => void;  // (legacy, used by parent — no longer wired since forms are inline)
  onOpenGiveaway?: () => void;
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
  if (m < 1)  return "nettopp";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  const d = Math.floor(h / 24);
  return `${d} dag${d === 1 ? "" : "er"} siden`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type ActiveTool = null | "poll" | "giveaway";

export default function StreamStudio({
  orgId, userId, embedSrc, twitchChat,
  viewerCount, streamTitle, liveSince,
  onClose,
}: Props) {
  const [polls,     setPolls]     = useState<PollHistory[]>([]);
  const [giveaways, setGiveaways] = useState<GiveawayHistory[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dmWinner,  setDmWinner]  = useState<GiveawayHistory["winner"] | null>(null);
  const [uptime,    setUptime]    = useState("—");
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);

  useEffect(() => {
    if (!liveSince) return;
    function tick() { setUptime(fmtDur(Date.now() - liveSince!.getTime())); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveSince]);

  async function loadHistory() {
    try {
      const res = await fetch(`/api/live/history?orgId=${orgId}`);
      if (!res.ok) return;
      const data = await res.json() as { polls: PollHistory[]; giveaways: GiveawayHistory[] };
      setPolls(data.polls);
      setGiveaways(data.giveaways);
      setLoading(false);
    } catch { /* silent */ }
  }

  useEffect(() => {
    void loadHistory();
    const id = setInterval(loadHistory, 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Split: dagens stream (created after liveSince) vs eldre
  const liveSinceMs = liveSince?.getTime() ?? 0;
  const todayPolls     = polls.filter((p)     => new Date(p.createdAt).getTime() >= liveSinceMs);
  const olderPolls     = polls.filter((p)     => new Date(p.createdAt).getTime() <  liveSinceMs);
  const todayGiveaways = giveaways.filter((g) => new Date(g.createdAt).getTime() >= liveSinceMs);
  const olderGiveaways = giveaways.filter((g) => new Date(g.createdAt).getTime() <  liveSinceMs);

  // Combine today's polls + giveaways into one chronological log
  type TodayEvent =
    | { kind: "poll"; data: PollHistory }
    | { kind: "giveaway"; data: GiveawayHistory };
  const todayEvents: TodayEvent[] = [
    ...todayPolls.map<TodayEvent>((p) => ({ kind: "poll", data: p })),
    ...todayGiveaways.map<TodayEvent>((g) => ({ kind: "giveaway", data: g })),
  ].sort((a, b) =>
    new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg-primary)" }}>

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
        <div className="min-w-0">
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
          <div className="aspect-video bg-black shrink-0">
            {embedSrc
              ? <iframe src={embedSrc} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen" title="Stream" />
              : <div className="flex h-full items-center justify-center text-zinc-700 text-xs">Ingen stream</div>
            }
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {twitchChat
              ? <iframe src={twitchChat} className="h-full w-full" title="Twitch Chat" />
              : <StreamChat orgId={orgId} userId={userId} disabled={false} />
            }
          </div>
        </div>

        {/* Right col: scrollable workspace */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-5 space-y-5">

            {/* Always-visible action panel */}
            <section
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {activeTool === null && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Start nytt</p>
                    <p className="text-[10px] text-white/30">— vises som overlay til seere</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveTool("poll")}
                      className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
                      style={{
                        background: "rgba(168,85,247,0.15)",
                        color:      "#A855F7",
                        border:     "1px solid rgba(168,85,247,0.30)",
                      }}
                    >
                      <BarChart3 className="h-4 w-4" /> Start avstemning
                    </button>
                    <button
                      onClick={() => setActiveTool("giveaway")}
                      className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
                      style={{
                        background: "rgba(251,191,36,0.15)",
                        color:      "#FBBF24",
                        border:     "1px solid rgba(251,191,36,0.30)",
                      }}
                    >
                      <Gift className="h-4 w-4" /> Start giveaway
                    </button>
                  </div>
                </>
              )}

              {activeTool === "poll" && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" style={{ color: "#A855F7" }} />
                    <p className="text-sm font-semibold text-white">Ny avstemning</p>
                  </div>
                  <PollForm
                    orgId={orgId}
                    onDone={() => { setActiveTool(null); void loadHistory(); }}
                    onCancel={() => setActiveTool(null)}
                  />
                </>
              )}

              {activeTool === "giveaway" && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4" style={{ color: "#FBBF24" }} />
                    <p className="text-sm font-semibold text-white">Ny giveaway</p>
                  </div>
                  <GiveawayForm
                    orgId={orgId}
                    onDone={() => { setActiveTool(null); void loadHistory(); }}
                    onCancel={() => setActiveTool(null)}
                  />
                </>
              )}
            </section>

            {/* Active now */}
            <section>
              <SectionHeader title="Aktivt nå" subtitle="Live avstemninger og giveaways akkurat nå" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 empty:hidden">
                <div className="empty:hidden">
                  <LivePollOverlay orgId={orgId} isAdmin={true} />
                </div>
                <div className="empty:hidden">
                  <LiveGiveawayOverlay orgId={orgId} isAdmin={true} />
                </div>
              </div>
              {/* Quiet hint when nothing is active */}
              <div className="empty:hidden" />
            </section>

            {/* Dagens stream — events from current live session */}
            {liveSince && (
              <section>
                <SectionHeader
                  title="Dagens stream"
                  subtitle={`Logg for denne live-økten (siden ${liveSince.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })})`}
                />
                {todayEvents.length === 0 ? (
                  <EmptyCard text="Ingen events startet denne økten ennå. Start en avstemning eller giveaway over." />
                ) : (
                  <div
                    className="rounded-2xl divide-y divide-white/[0.06]"
                    style={{ background: "rgba(94,234,212,0.04)", border: "1px solid rgba(94,234,212,0.20)" }}
                  >
                    {todayEvents.map((ev) => (
                      <LogRow key={`${ev.kind}-${ev.data.id}`} event={ev} onDmWinner={(w) => setDmWinner(w)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Historikk — tidligere streams (compact text log + winners) */}
            {(olderPolls.length > 0 || olderGiveaways.length > 0) && (
              <section>
                <SectionHeader title="Historikk" subtitle="Tidligere streams og events" />
                <div
                  className="rounded-2xl divide-y divide-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {/* Merge into one chronological list */}
                  {[
                    ...olderPolls.map((p)     => ({ kind: "poll"     as const, data: p })),
                    ...olderGiveaways.map((g) => ({ kind: "giveaway" as const, data: g })),
                  ]
                    .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
                    .map((ev) => (
                      <LogRow key={`${ev.kind}-${ev.data.id}`} event={ev} onDmWinner={(w) => setDmWinner(w)} compact />
                    ))}
                </div>
              </section>
            )}

            {loading && (
              <p className="text-xs text-white/40 text-center py-4">Henter historikk…</p>
            )}
          </div>
        </div>
      </div>

      {dmWinner && <DmWinnerModal winner={dmWinner} onClose={() => setDmWinner(null)} />}
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

function EmptyCard({ text }: { text: string }) {
  return (
    <div
      className="rounded-2xl py-5 px-4 text-center"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
    >
      <p className="text-xs text-white/40">{text}</p>
    </div>
  );
}

// ─── Log row (unified for polls + giveaways) ──────────────────────────────────

type LogEvent =
  | { kind: "poll";     data: PollHistory }
  | { kind: "giveaway"; data: GiveawayHistory };

function LogRow({ event, onDmWinner, compact }: {
  event:      LogEvent;
  onDmWinner: (w: NonNullable<GiveawayHistory["winner"]>) => void;
  compact?:   boolean;
}) {
  if (event.kind === "poll") {
    const p = event.data;
    const winner = p.options[0];
    return (
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            <span className="text-white/50">Avstemning:</span> {p.question}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            Vinner: <span className="text-white/80">{winner?.label ?? "—"}</span>
            {" · "}{p.totalVotes} {p.totalVotes === 1 ? "stemme" : "stemmer"}
            {" · "}{compact ? fmtDate(p.createdAt) : relTime(p.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  const g = event.data;
  const cancelled = g.status === "CANCELLED";
  return (
    <div className="flex items-start gap-3 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{
        background: cancelled ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.15)",
        color:      cancelled ? "rgba(255,255,255,0.4)" : "#FBBF24",
      }}>
        {cancelled ? <X className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          <span className="text-white/50">Giveaway:</span> {g.title}
          {g.prize && <span className="text-white/50"> — 🎁 {g.prize}</span>}
        </p>
        <p className="text-[11px] text-white/50 mt-0.5">
          {cancelled
            ? <>Kansellert · {compact ? fmtDate(g.createdAt) : relTime(g.createdAt)}</>
            : <>
                Vinner:{" "}
                {g.winner
                  ? <a
                      href={`/u/${g.winner.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium transition-colors hover:underline"
                      style={{ color: "#5EEAD4" }}
                      title={`Se profilen til ${g.winner.name ?? g.winner.username}`}
                    >
                      @{g.winner.username}
                    </a>
                  : <span className="text-white/80">—</span>
                }
                {" · "}{g.entryCount} {g.entryCount === 1 ? "deltaker" : "deltakere"}
                {" · "}{compact ? fmtDate(g.createdAt) : relTime(g.createdAt)}
              </>
          }
        </p>
      </div>
      {g.winner && !cancelled && (
        <button
          onClick={() => onDmWinner(g.winner!)}
          className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-transform hover:scale-105"
          style={{ background: "rgba(94,234,212,0.15)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.30)" }}
        >
          <Send className="h-2.5 w-2.5" /> DM
        </button>
      )}
    </div>
  );
}

// ─── DM winner modal ──────────────────────────────────────────────────────────

function DmWinnerModal({ winner, onClose }: {
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
        style={{ background: "var(--bg-secondary)", border: "1px solid rgba(94,234,212,0.30)" }}
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
          <button onClick={onClose} className="rounded-full px-4 py-2 text-xs text-white/60 hover:text-white">Avbryt</button>
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
          <Crown className="inline h-2.5 w-2.5 mr-1" /> Dere må være venner for at meldingen kommer frem
        </p>
      </div>
    </div>
  );
}

void Award; // imports retained for future use
