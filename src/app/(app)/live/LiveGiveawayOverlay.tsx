"use client";

import { useEffect, useState, useTransition } from "react";
import { Gift, Crown, Users, Trophy, X, Sparkles, Loader2 } from "lucide-react";

interface GiveawayData {
  id:              string;
  title:           string;
  prize:           string;
  requireFanpass:  boolean;
  entryCount:      number;
  iHaveEntered:    boolean;
  userMeetsFanpass: boolean;
  endsAt:          string;
  secondsLeft:     number;
}

interface WinnerResult {
  id:       string;
  name:     string | null;
  username: string;
  avatarUrl: string | null;
}

interface Props {
  orgId:   string;
  isAdmin: boolean;
  onClose?: () => void;
}

function fmtTime(sec: number) {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${sec}s`;
}

export default function LiveGiveawayOverlay({ orgId, isAdmin, onClose }: Props) {
  const [ga, setGa] = useState<GiveawayData | null>(null);
  const [winner, setWinner] = useState<WinnerResult | null>(null);
  const [entering, setEntering] = useState(false);
  const [drawing,  setDrawing]  = useState(false);
  const [, start]   = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function fetchGa() {
      try {
        const res = await fetch(`/api/live/giveaways?orgId=${orgId}`);
        if (!res.ok) return;
        const data = await res.json() as { giveaway: GiveawayData | null };
        if (!cancelled) {
          // If giveaway disappeared, clear winner overlay after 8s grace
          if (!data.giveaway && ga) {
            setTimeout(() => { if (!cancelled) { setGa(null); setWinner(null); } }, 8000);
          } else {
            setGa(data.giveaway);
          }
        }
      } catch { /* silent */ }
    }
    void fetchGa();
    const id = setInterval(fetchGa, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [orgId, ga]);

  // Local countdown
  useEffect(() => {
    if (!ga) return;
    const id = setInterval(() => {
      setGa((g) => g && g.secondsLeft > 0 ? { ...g, secondsLeft: g.secondsLeft - 1 } : g);
    }, 1000);
    return () => clearInterval(id);
  }, [ga?.id]);

  async function enter() {
    if (!ga || entering || ga.iHaveEntered) return;
    setEntering(true);
    // Optimistic
    setGa((g) => g ? { ...g, iHaveEntered: true, entryCount: g.entryCount + 1 } : g);
    try {
      await fetch(`/api/live/giveaways/${ga.id}`, { method: "POST" });
    } finally {
      setEntering(false);
    }
  }

  async function drawWinner() {
    if (!ga || drawing) return;
    setDrawing(true);
    start(async () => {
      try {
        const res = await fetch(`/api/live/giveaways/${ga.id}`, { method: "PATCH" });
        const data = await res.json() as { winner?: WinnerResult; cancelled?: boolean };
        if (data.winner) setWinner(data.winner);
        if (data.cancelled) onClose?.();
        setGa(null); // hide entry-UI, winner-overlay shows instead
      } finally {
        setDrawing(false);
      }
    });
  }

  // Winner overlay (shown after draw)
  if (winner) {
    return (
      <div
        className="absolute inset-x-4 bottom-4 z-30 max-w-md mx-auto rounded-2xl p-5 shadow-2xl text-center"
        style={{
          background:           "linear-gradient(135deg, rgba(11,16,39,0.95), rgba(40,18,60,0.95))",
          border:               "1px solid rgba(251,191,36,0.50)",
          backdropFilter:       "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow:            "0 8px 60px rgba(251,191,36,0.40)",
        }}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
             style={{ background: "linear-gradient(135deg, #FBBF24, #A855F7)", color: "#fff" }}>
          <Trophy className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#FBBF24" }}>
          Vinner kåret
        </p>
        <p className="mt-1 text-xl font-bold text-white">{winner.name ?? winner.username}</p>
        <p className="mt-1 text-sm text-white/60">vant giveawayet 🎉</p>
        <button
          onClick={() => { setWinner(null); onClose?.(); }}
          className="mt-3 text-[10px] text-white/40 hover:text-white"
        >
          Lukk
        </button>
      </div>
    );
  }

  if (!ga) return null;

  const ended = ga.secondsLeft <= 0;

  return (
    <div
      className="absolute inset-x-4 bottom-4 z-30 max-w-md mx-auto rounded-2xl p-4 shadow-2xl"
      style={{
        background:           "linear-gradient(135deg, rgba(11,16,39,0.92), rgba(19,26,53,0.92))",
        border:               "1px solid rgba(251,191,36,0.40)",
        backdropFilter:       "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow:            "0 8px 40px rgba(251,191,36,0.20)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: "rgba(251,191,36,0.20)", color: "#FBBF24" }}
        >
          <Gift className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#FBBF24" }}>
          Giveaway
        </p>
        {!ended && (
          <span
            className="ml-auto text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full"
            style={{ background: "rgba(251,191,36,0.15)", color: "#fff" }}
          >
            {fmtTime(ga.secondsLeft)}
          </span>
        )}
        {ended && (
          <span className="ml-auto text-[11px] text-rose-400 font-semibold">Avsluttet</span>
        )}
      </div>

      <p className="text-sm font-bold text-white">{ga.title}</p>
      <p className="text-xs text-white/70 mt-0.5">🎁 {ga.prize}</p>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
          <Users className="h-3 w-3" />
          {ga.entryCount} {ga.entryCount === 1 ? "deltaker" : "deltakere"}
        </div>
        {ga.requireFanpass && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
               style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>
            <Crown className="h-2.5 w-2.5" /> Kun Fanpass
          </div>
        )}
      </div>

      {/* Action area */}
      <div className="mt-3">
        {ended ? (
          isAdmin ? (
            <button
              onClick={() => void drawWinner()}
              disabled={drawing}
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FBBF24, #A855F7)", color: "#fff" }}
            >
              {drawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Trekk vinner
            </button>
          ) : (
            <p className="text-center text-xs text-white/40">Venter på at creator trekker vinner…</p>
          )
        ) : ga.iHaveEntered ? (
          <button disabled
            className="w-full flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold"
            style={{ background: "rgba(94,234,212,0.15)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.30)" }}
          >
            <Trophy className="h-3.5 w-3.5" /> Du er med!
          </button>
        ) : !ga.userMeetsFanpass ? (
          <p className="text-center text-xs text-amber-400">Krever aktiv Fanpass for å delta</p>
        ) : (
          <button
            onClick={() => void enter()}
            disabled={entering}
            className="w-full flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FBBF24, #F472B6)", color: "#fff" }}
          >
            {entering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
            Bli med på trekningen
          </button>
        )}
      </div>
    </div>
  );
}
