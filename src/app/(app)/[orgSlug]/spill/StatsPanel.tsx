"use client";

import { useEffect, useState } from "react";

interface Props {
  chess:   { rating: number; wins: number; losses: number; draws: number } | null;
  clicker: { prestigeWorld: number; prestigeLevel: number; allTimeHighCoins: number } | null;
  worldEmoji: string;
  worldName:  string;
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("no-NO");
}

function ratingColor(r: number): string {
  if (r >= 1600) return "#fbbf24";
  if (r >= 1400) return "#a78bfa";
  if (r >= 1200) return "#34d399";
  return "rgba(255,255,255,0.5)";
}

export default function StatsPanel({ chess, clicker, worldEmoji, worldName }: Props) {
  const [wordleStreak, setWordleStreak] = useState<number | null>(null);
  const [hs2048,       setHs2048]       = useState<number | null>(null);
  const [wordleDone,   setWordleDone]   = useState(false);

  useEffect(() => {
    try {
      const streak = parseInt(localStorage.getItem("wordle_streak") ?? "0", 10);
      if (isFinite(streak)) setWordleStreak(streak);

      // Check if today's wordle is done
      const d    = new Date();
      const key  = `wordle_${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      const raw  = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as { status: string };
        setWordleDone(s.status === "won" || s.status === "lost");
      }

      const hs = parseInt(localStorage.getItem("2048_hs") ?? "0", 10);
      if (isFinite(hs) && hs > 0) setHs2048(hs);
    } catch { /* localStorage not available */ }
  }, []);

  const hasAny = chess || clicker || wordleStreak !== null || hs2048 !== null;

  return (
    <aside
      className="flex flex-col gap-3"
      style={{ width: "100%" }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest px-1"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Dine stats
      </p>

      {!hasAny && (
        <div
          className="rounded-xl p-4 text-center text-xs"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }}
        >
          Spill noen spill for å se statistikk her
        </div>
      )}

      {/* Chess */}
      {chess && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">♟️</span>
            <span className="text-sm font-semibold text-white">Sjakk</span>
          </div>
          <div className="mb-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black" style={{ color: ratingColor(chess.rating) }}>
              {chess.rating}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>rating</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span style={{ color: "#34d399" }}><strong>{chess.wins}</strong> V</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}><strong>{chess.draws}</strong> U</span>
            <span style={{ color: "#f87171" }}><strong>{chess.losses}</strong> T</span>
          </div>
        </div>
      )}

      {/* Clicker */}
      {clicker && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🖱️</span>
            <span className="text-sm font-semibold text-white">Klikker</span>
          </div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">{worldEmoji}</span>
            <span className="text-sm font-semibold text-white">{worldName}</span>
          </div>
          <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Prestige <strong className="text-white">{clicker.prestigeLevel}</strong></span>
            {clicker.allTimeHighCoins > 0 && (
              <span>Rekord <strong className="text-white">{fmt(clicker.allTimeHighCoins)}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Wordle */}
      {wordleStreak !== null && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🟩</span>
              <span className="text-sm font-semibold text-white">Wordle</span>
            </div>
            {wordleDone && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(29,158,117,0.2)", color: "#1d9e75" }}>
                ✓ I dag
              </span>
            )}
          </div>
          {wordleStreak > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black" style={{ color: wordleStreak >= 7 ? "#f9c74f" : "#1d9e75" }}>
                {wordleStreak > 1 ? `🔥 ${wordleStreak}` : "1"}
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {wordleStreak === 1 ? "dag" : "dager på rad"}
              </span>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Ingen streak ennå</p>
          )}
        </div>
      )}

      {/* 2048 */}
      {hs2048 !== null && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🔢</span>
            <span className="text-sm font-semibold text-white">2048</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black" style={{ color: "#a78bfa" }}>
              {hs2048.toLocaleString("no-NO")}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>rekord</span>
          </div>
        </div>
      )}
    </aside>
  );
}
