import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import StatsPanel from "./StatsPanel";
import { WORLDS } from "@/lib/clickerUpgrades";

export default async function SpillPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // ── Fetch user stats ───────────────────────────────────────────────────
  let chess:   { rating: number; wins: number; losses: number; draws: number } | null = null;
  let clicker: { prestigeWorld: number; prestigeLevel: number; allTimeHighCoins: number } | null = null;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const org = await db.organization.findUnique({
        where:  { slug: orgSlug },
        select: { id: true },
      });
      if (org) {
        const [cp, clp] = await Promise.all([
          db.chessProfile.findUnique({
            where:  { userId_orgId: { userId: session.user.id, orgId: org.id } },
            select: { rating: true, wins: true, losses: true, draws: true },
          }),
          db.clickerProfile.findUnique({
            where:  { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
            select: { prestigeWorld: true, prestigeLevel: true, allTimeHighCoins: true },
          }),
        ]);
        chess   = cp;
        clicker = clp ? { ...clp, allTimeHighCoins: Number(clp.allTimeHighCoins) } : null;
      }
    }
  } catch { /* non-critical — page still renders without stats */ }

  const worldNum  = clicker?.prestigeWorld ?? 1;
  const worldDef  = WORLDS[worldNum] ?? WORLDS[1]!;

  // ── Game definitions ───────────────────────────────────────────────────
  const GAMES = [
    {
      href:        `/${orgSlug}/clicker`,
      icon:        "🖱️",
      iconBg:      "rgba(108,71,255,0.25)",
      title:       "Klikker",
      badge:       "Solo",
      badgeStyle:  { background: "rgba(108,71,255,0.2)", color: "#a78bfa" },
      description: "Klikk deg til rikdom, kjøp oppgraderinger og prestige gjennom 9 unike verdener.",
      accentColor: "#6c47ff",
      borderColor: "rgba(108,71,255,0.2)",
    },
    {
      href:        `/${orgSlug}/spill/sjakk`,
      icon:        "♟️",
      iconBg:      "rgba(16,185,129,0.2)",
      title:       "Sjakk",
      badge:       "2 spillere",
      badgeStyle:  { background: "rgba(16,185,129,0.15)", color: "#34d399" },
      description: "Utfordre en venn til en klassisk sjakkpartie med Elo-rating. Trekk vises i sanntid.",
      accentColor: "#10b981",
      borderColor: "rgba(16,185,129,0.2)",
    },
    {
      href:        `/${orgSlug}/spill/2048`,
      icon:        "🔢",
      iconBg:      "rgba(139,92,246,0.2)",
      title:       "2048",
      badge:       "Solo",
      badgeStyle:  { background: "rgba(139,92,246,0.15)", color: "#c4b5fd" },
      description: "Slå sammen brikker og nå 2048. Bruk piltaster eller sveip. Enkel å lære, umulig å stoppe.",
      accentColor: "#8b5cf6",
      borderColor: "rgba(139,92,246,0.2)",
    },
    {
      href:        `/${orgSlug}/spill/wordle`,
      icon:        "🟩",
      iconBg:      "rgba(29,158,117,0.2)",
      title:       "Wordle",
      badge:       "Daglig",
      badgeStyle:  { background: "rgba(29,158,117,0.15)", color: "#1d9e75" },
      description: "Gjett det norske 5-bokstavsordet på 6 forsøk. Nytt ord hver dag — samme for alle.",
      accentColor: "#1d9e75",
      borderColor: "rgba(29,158,117,0.2)",
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12" style={{ background: "#0d0d14" }}>
      <div className="mx-auto max-w-5xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-black text-white tracking-tight">🎮 Spill</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {GAMES.length} spill tilgjengelig
          </p>
        </div>

        {/* Main layout: cards + sidebar */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

          {/* ── Game cards grid ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {GAMES.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${g.borderColor}`,
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{ background: g.accentColor }}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Icon + badge row */}
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                        style={{ background: g.iconBg }}
                      >
                        {g.icon}
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={g.badgeStyle}
                      >
                        {g.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="mb-1.5 text-lg font-bold text-white">{g.title}</p>

                    {/* Description */}
                    <p
                      className="flex-1 text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {g.description}
                    </p>

                    {/* CTA */}
                    <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: g.accentColor }}>
                      Spill nå
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Coin info note */}
            <p
              className="mt-5 text-xs"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              🪙 Alle spill gir Fanpass-coins. Sjakk, 2048 og Wordle gir ekstra daglige coins.
            </p>
          </div>

          {/* ── Stats sidebar (desktop) ──────────────────────────────── */}
          <div className="w-full lg:w-64 lg:shrink-0">
            <StatsPanel
              chess={chess}
              clicker={clicker}
              worldEmoji={worldDef.emoji}
              worldName={worldDef.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
