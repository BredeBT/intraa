"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";

interface StreakData {
  streak:        number;
  longestStreak: number;
  lastStreakDay: string | null;
  nextTier:      number | null;
}

const S = {
  surface:  "#0B1027",
  surface2: "#131A35",
  text:     "#F0F4FF",
  muted:    "rgba(240,244,255,0.6)",
  subtle:   "rgba(240,244,255,0.4)",
  line:     "rgba(240,244,255,0.08)",
  flame:    "#FB923C",  // varm orange — flame
  teal:     "#5EEAD4",
} as const;

const TIER_LABELS: Record<number, string> = {
  3:   "3-dagers bonus",
  7:   "1-ukes bonus",
  14:  "2-ukers bonus",
  30:  "30-dagers bonus",
  100: "100-dagers bonus",
};
const TIER_COINS: Record<number, number> = {
  3:   10,
  7:   50,
  14:  100,
  30:  500,
  100: 2500,
};

export default function StreakBadge() {
  const [data, setData] = useState<StreakData | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/streak")
      .then((r) => r.ok ? r.json() as Promise<StreakData> : Promise.reject())
      .then(setData)
      .catch(() => null);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!data || data.streak === 0) return null;

  const isHot = data.streak >= 3;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="nav-link flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold"
        style={{
          background: isHot ? `${S.flame}15` : S.surface2,
          color:      isHot ? S.flame : S.muted,
          border:     `1px solid ${isHot ? `${S.flame}30` : S.line}`,
        }}
        aria-label={`${data.streak} dagers streak`}
      >
        <Flame
          className="h-4 w-4"
          style={isHot ? { filter: `drop-shadow(0 0 4px ${S.flame})` } : undefined}
          fill={isHot ? S.flame : "none"}
        />
        <span className="tabular-nums">{data.streak}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl p-4 shadow-2xl"
          style={{
            background: S.surface,
            border:     `1px solid ${S.line}`,
            boxShadow:  `0 12px 32px rgba(0,0,0,0.4)`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${S.flame}20` }}
            >
              <Flame
                className="h-5 w-5"
                style={{ filter: `drop-shadow(0 0 6px ${S.flame})` }}
                fill={S.flame}
                color={S.flame}
              />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: S.text }}>
                {data.streak} <span className="text-sm font-normal" style={{ color: S.muted }}>
                  {data.streak === 1 ? "dag" : "dager"}
                </span>
              </p>
              <p className="text-xs mt-1" style={{ color: S.subtle }}>
                Lengste streak: {data.longestStreak}
              </p>
            </div>
          </div>

          {data.nextTier !== null && (
            <div
              className="rounded-lg px-3 py-2.5 mb-3"
              style={{ background: S.surface2, border: `1px solid ${S.line}` }}
            >
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: S.subtle }}>
                Neste milepæl
              </p>
              <p className="text-sm font-medium" style={{ color: S.text }}>
                {data.nextTier - data.streak} {data.nextTier - data.streak === 1 ? "dag" : "dager"} til {TIER_LABELS[data.nextTier]}
              </p>
              <p className="text-xs mt-0.5" style={{ color: S.teal }}>
                +{TIER_COINS[data.nextTier]} coins i hvert community
              </p>
            </div>
          )}

          <p className="text-xs leading-relaxed" style={{ color: S.muted }}>
            Logg inn eller gjør noe på Intraa hver dag for å holde streaken.
            Hopper du over én dag, starter telleren på nytt.
          </p>
        </div>
      )}
    </div>
  );
}
