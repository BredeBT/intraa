"use client";

import { useEffect, useState } from "react";

interface Props {
  chess:   { rating: number; wins: number; losses: number; draws: number } | null;
  clicker: { prestigeWorld: number; prestigeLevel: number; allTimeHighCoins: number } | null;
  worldEmoji: string;
  worldName:  string;
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
  pink:     "#F472B6",
  amber:    "#FBBF24",
  rose:     "#F87171",
} as const;

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("no-NO");
}

function ratingColor(r: number): string {
  if (r >= 1600) return S.amber;
  if (r >= 1400) return S.purple;
  if (r >= 1200) return S.teal;
  return S.subtle;
}

function Card({
  emoji, title, accent, children,
}: {
  emoji:   string;
  title:   string;
  accent:  string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: S.surface, border: `1px solid ${S.line}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          {emoji}
        </div>
        <span className="text-sm font-semibold" style={{ color: S.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function StatsPanel({ chess, clicker, worldEmoji, worldName }: Props) {
  const [wordleStreak, setWordleStreak] = useState<number | null>(null);
  const [hs2048,       setHs2048]       = useState<number | null>(null);
  const [wordleDone,   setWordleDone]   = useState(false);

  useEffect(() => {
    try {
      const streak = parseInt(localStorage.getItem("wordle_streak") ?? "0", 10);
      if (isFinite(streak)) setWordleStreak(streak);

      const d   = new Date();
      const key = `wordle_${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      const raw = localStorage.getItem(key);
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
    <aside className="flex w-full flex-col gap-3">
      <p
        className="text-[10px] font-bold uppercase tracking-widest px-1"
        style={{ color: S.subtle }}
      >
        Dine stats
      </p>

      {!hasAny && (
        <div
          className="rounded-xl p-4 text-center text-xs"
          style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.subtle }}
        >
          Spill noen spill for å se statistikk her
        </div>
      )}

      {chess && (
        <Card emoji="♟" title="Sjakk" accent={S.purple}>
          <div className="mb-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums" style={{ color: ratingColor(chess.rating) }}>
              {chess.rating}
            </span>
            <span className="text-xs" style={{ color: S.subtle }}>rating</span>
          </div>
          <div className="flex gap-3 text-xs tabular-nums">
            <span style={{ color: S.teal }}><strong>{chess.wins}</strong> V</span>
            <span style={{ color: S.subtle }}><strong>{chess.draws}</strong> U</span>
            <span style={{ color: S.rose }}><strong>{chess.losses}</strong> T</span>
          </div>
        </Card>
      )}

      {clicker && (
        <Card emoji="🖱" title="Klikker" accent={S.teal}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">{worldEmoji}</span>
            <span className="text-sm font-semibold" style={{ color: S.text }}>{worldName}</span>
          </div>
          <div className="flex gap-3 text-xs" style={{ color: S.muted }}>
            <span>Prestige <strong style={{ color: S.text }}>{clicker.prestigeLevel}</strong></span>
            {clicker.allTimeHighCoins > 0 && (
              <span>Rekord <strong style={{ color: S.text }}>{fmt(clicker.allTimeHighCoins)}</strong></span>
            )}
          </div>
        </Card>
      )}

      {wordleStreak !== null && (
        <Card emoji="🟩" title="Wordle" accent={S.blue}>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: wordleStreak >= 7 ? S.amber : wordleStreak > 0 ? S.blue : S.subtle }}
              >
                {wordleStreak > 0 ? wordleStreak : "—"}
              </span>
              <span className="text-xs" style={{ color: S.subtle }}>
                {wordleStreak === 1 ? "dag" : wordleStreak > 1 ? "dager" : "ingen streak"}
              </span>
            </div>
            {wordleDone && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${S.teal}20`, color: S.teal }}
              >
                ✓ I dag
              </span>
            )}
          </div>
        </Card>
      )}

      {hs2048 !== null && (
        <Card emoji="🔢" title="2048" accent={S.pink}>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums" style={{ color: S.pink }}>
              {hs2048.toLocaleString("no-NO")}
            </span>
            <span className="text-xs" style={{ color: S.subtle }}>rekord</span>
          </div>
        </Card>
      )}
    </aside>
  );
}
