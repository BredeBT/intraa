import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import StatsPanel from "./StatsPanel";
import { WORLDS } from "@/lib/clickerUpgrades";

// ─── Aurora-tokens (matcher landing + resten av appen) ───────────────────────
const S = {
  bg:       "#050816",
  surface:  "#0B1027",
  surface2: "#131A35",
  line:     "rgba(240,244,255,0.08)",
  lineHi:   "rgba(240,244,255,0.14)",
  text:     "#F0F4FF",
  muted:    "rgba(240,244,255,0.6)",
  subtle:   "rgba(240,244,255,0.4)",
  faint:    "rgba(240,244,255,0.25)",
  teal:     "#5EEAD4",
  purple:   "#A855F7",
  blue:     "#60A5FA",
  pink:     "#F472B6",
  amber:    "#FBBF24",
} as const;

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

  const worldNum = clicker?.prestigeWorld ?? 1;
  const worldDef = WORLDS[worldNum] ?? WORLDS[1]!;

  // ── Game definitions — 4 likeverdige kort med Aurora-aksenter ──────────
  const GAMES = [
    {
      key:         "sjakk",
      title:       "Sjakk",
      emoji:       "♟",
      accent:      S.purple,
      tagline:     "Klassisk parti med Elo-rating.",
      actions: [
        { href: `/${orgSlug}/spill/sjakk`,        label: "Mot venn",   note: "1v1 med Elo" },
        { href: `/${orgSlug}/spill/sjakk/maskin`, label: "Mot maskin", note: "AI fra enkel til umulig" },
      ],
    },
    {
      key:         "klikker",
      title:       "Klikker",
      emoji:       "🖱",
      accent:      S.teal,
      tagline:     "Bygg en idle-økonomi gjennom 9 verdener.",
      actions: [
        { href: `/${orgSlug}/clicker`, label: "Spill nå", note: "Solo · idle" },
      ],
    },
    {
      key:         "2048",
      title:       "2048",
      emoji:       "🔢",
      accent:      S.pink,
      tagline:     "Slå sammen brikker til du når 2048.",
      actions: [
        { href: `/${orgSlug}/spill/2048`, label: "Spill nå", note: "Solo · piltaster" },
      ],
    },
    {
      key:         "wordle",
      title:       "Wordle",
      emoji:       "🟩",
      accent:      S.blue,
      tagline:     "Gjett dagens norske 5-bokstavsord.",
      actions: [
        { href: `/${orgSlug}/spill/wordle`, label: "Spill nå", note: "Daglig · samme ord for alle" },
      ],
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12" style={{ background: S.bg, color: S.text }}>
      <div className="mx-auto max-w-5xl">

        {/* Page header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: S.text }}>
              Spill
            </h1>
            <p className="mt-1 text-sm" style={{ color: S.subtle }}>
              {GAMES.length} spill — alle gir Fanpass-coins når du spiller
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Game cards ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GAMES.map((g) => (
              <article
                key={g.key}
                className="relative flex flex-col rounded-2xl p-5 overflow-hidden"
                style={{
                  background: S.surface,
                  border:     `1px solid ${S.line}`,
                }}
              >
                {/* Accent-glow i kortets hjørne */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${g.accent}30, transparent 70%)`,
                    filter:     "blur(8px)",
                  }}
                />

                {/* Header: emoji + tittel */}
                <div className="relative mb-3 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{
                      background: `${g.accent}15`,
                      border:     `1px solid ${g.accent}30`,
                    }}
                  >
                    {g.emoji}
                  </div>
                  <h2 className="text-lg font-semibold" style={{ color: S.text }}>{g.title}</h2>
                </div>

                {/* Tagline */}
                <p className="relative mb-5 text-sm leading-relaxed" style={{ color: S.muted }}>
                  {g.tagline}
                </p>

                {/* Actions — 1 eller 2 knapper */}
                <div className="relative mt-auto flex flex-col gap-2">
                  {g.actions.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="nav-link group flex items-center justify-between rounded-lg px-3.5 py-2.5"
                      style={{
                        background: `${g.accent}10`,
                        border:     `1px solid ${g.accent}25`,
                        color:      g.accent,
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{a.label}</span>
                        <span className="text-[11px]" style={{ color: S.subtle }}>{a.note}</span>
                      </div>
                      <span
                        className="text-base transition-transform group-hover:translate-x-0.5"
                        style={{ color: g.accent }}
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* ── Stats sidebar ─────────────────────────────────────── */}
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
