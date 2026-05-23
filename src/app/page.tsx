import Link from "next/link";
import {
  ArrowRight, Radio, MessageSquare, Gamepad2, Crown,
  Coins, Trophy, Send, Sparkles, ChevronRight,
} from "lucide-react";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Aurora palette tokens — applied via inline style for exact hex match.
 * Mirrors the CSS variables in globals.css.
 */
const C = {
  bg:        "#050816",
  surface:   "#0B1027",
  surface2:  "#131A35",
  line:      "rgba(255,255,255,0.08)",
  lineHi:    "rgba(255,255,255,0.16)",
  text:      "#F0F4FF",
  muted:     "rgba(255,255,255,0.6)",
  mutedHi:   "rgba(255,255,255,0.75)",
  teal:      "#5EEAD4",
  purple:    "#A855F7",
  blue:      "#60A5FA",
  pink:      "#F472B6",
  // legacy aliases kept so existing JSX continues to compile while we transition
  cream:     "#F0F4FF",
  orange:    "#A855F7",
  amber:     "#A855F7",
  mint:      "#5EEAD4",
  rose:      "#F472B6",
} as const;

export default async function Home() {
  let orgCount = 0, userCount = 0, messageCount = 0, postCount = 0;
  try {
    [orgCount, userCount, messageCount, postCount] = await Promise.all([
      db.organization.count({ where: { slug: { not: "intraa-support" } } }),
      db.user.count(),
      db.message.count(),
      db.post.count(),
    ]);
  } catch { /* DB utilgjengelig under bygg */ }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: C.bg, color: C.text }}
    >
      {/* Aurora blobs — northern-lights backdrop, kun en antydning */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[120px]"
        style={{
          top:        "-10%",
          left:       "20%",
          background: `radial-gradient(circle, ${C.teal} 0%, transparent 70%)`,
          opacity:    0.10,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{
          top:        "20%",
          right:      "10%",
          background: `radial-gradient(circle, ${C.purple} 0%, transparent 70%)`,
          opacity:    0.09,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute h-[480px] w-[480px] rounded-full blur-[120px]"
        style={{
          bottom:     "10%",
          left:       "40%",
          background: `radial-gradient(circle, ${C.blue} 0%, transparent 70%)`,
          opacity:    0.07,
        }}
      />

      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10 py-5 backdrop-blur-md"
        style={{
          background:  "rgba(5,8,22,0.7)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          {/* Glass logo per spec */}
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black"
            style={{
              background:           "rgba(255,255,255,0.10)",
              border:               "0.5px solid rgba(255,255,255,0.20)",
              backdropFilter:       "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color:                "#fff",
            }}
          >
            i
          </span>
          <span className="text-lg font-bold tracking-tight" style={{ color: C.text }}>intraa</span>
        </Link>
        <div className="flex items-center gap-7 text-sm">
          <Link href="#funksjoner" className="hidden sm:block transition-colors hover:text-white" style={{ color: C.muted }}>Funksjoner</Link>
          <Link href="#priser"     className="hidden sm:block transition-colors hover:text-white" style={{ color: C.muted }}>Priser</Link>
          <Link href="/login"      className="transition-colors hover:text-white" style={{ color: C.muted }}>Logg inn</Link>
          {/* Primary CTA per spec — white on dark, max contrast */}
          <Link
            href="/registrer"
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/90"
            style={{
              background: "#FFFFFF",
              color:      C.bg,
            }}
          >
            Kom i gang
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 sm:px-10 pt-20 pb-24 lg:pt-28 lg:pb-32">
        {/* Film grain — dreper "flate AI-overflate"-følelsen. Veldig lav opacity, ligger over alle blobs men under content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
            backgroundSize:  "240px 240px",
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-6"
              style={{
                background: `${C.mint}10`,
                color:      C.mint,
                border:     `1px solid ${C.mint}30`,
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: C.mint }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: C.mint }} />
              </span>
              For norske creators — i åpen beta
            </div>

            <h1
              className="text-[clamp(2.5rem,6vw,4.75rem)] font-black leading-[0.95] tracking-tight text-balance"
              style={{ color: C.text }}
            >
              Communityet ditt.{" "}
              <span style={{ color: C.teal }}>Hjemmet</span>{" "}
              ditt.
            </h1>

            <p
              className="mt-7 max-w-xl text-[17px] leading-relaxed"
              style={{ color: C.mutedHi }}
            >
              Slutt å splitte fansen mellom Discord, Twitch og Patreon. Intraa er
              alt-i-ett-plattformen der streamen, chatten, spillene og Fanpass-en
              din lever sammen.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {/* Primary CTA: white on dark per Aurora spec */}
              <Link
                href="/registrer"
                className="group flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/90"
                style={{
                  background: "#FFFFFF",
                  color:      C.bg,
                }}
              >
                Start ditt community
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {/* Secondary glass CTA per Aurora spec */}
              <Link
                href="#funksjoner"
                className="flex items-center gap-1.5 rounded-full px-5 py-3.5 text-sm font-medium transition-colors hover:bg-white/[0.08]"
                style={{
                  background:           "rgba(255,255,255,0.05)",
                  border:               "0.5px solid rgba(255,255,255,0.12)",
                  backdropFilter:       "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color:                C.text,
                }}
              >
                Se hva som er inni
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-6 text-xs" style={{ color: C.muted }}>
              Gratis å starte · Ingen kredittkort · Norsk support
            </p>
          </div>

          {/* Right: floating UI mock — bevisst skjev så det ikke føles "algoritmisk midtstilt" */}
          <div className="relative lg:translate-y-6">
            <div className="lg:[transform:rotate(-1.5deg)]">
              <HeroMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features bento ───────────────────────────────────────────────── */}
      <section id="funksjoner" className="relative mx-auto max-w-6xl px-6 sm:px-10 pb-24">
        <div className="mb-12 max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: C.amber }}
          >
            Funksjoner
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: C.cream }}>
            Bygget for hvordan creators
            <br />
            <span style={{ color: C.muted }}>faktisk jobber.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 auto-rows-[minmax(220px,auto)]">

          {/* Big featured: Live */}
          <FeatureCard
            className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
            featured
            icon={<Radio className="h-5 w-5" />}
            iconColor={C.purple}
            title="Live på Twitch eller YouTube"
            description="Vi oppdager automatisk når du går live. Fansen får varsel, kan chatte i appen, og opprette klipp underveis."
          >
            <LiveMock />
          </FeatureCard>

          {/* Tall: Fanpass */}
          <FeatureCard
            className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
            icon={<Crown className="h-5 w-5" />}
            iconColor={C.pink}
            title="Fanpass-medlemskap"
            description="Selg eksklusiv tilgang. Medlemmer får ♛-badge, eksklusive bretttema i sjakk, og lukkede kanaler."
          >
            <FanpassMock />
          </FeatureCard>

          {/* Small row */}
          <FeatureCard
            className="lg:col-span-2"
            icon={<MessageSquare className="h-5 w-5" />}
            iconColor={C.teal}
            title="Sanntids-chat og feed"
            description="Tråder, reaksjoner, fildeling — som Discord, men koblet til alt annet du har."
          />

          <FeatureCard
            className="lg:col-span-2"
            icon={<Gamepad2 className="h-5 w-5" />}
            iconColor={C.pink}
            title="Spill og minigames"
            description="Sjakk med Elo, idle clicker, Wordle, 2048 — alt belønner med coins."
          />

          <FeatureCard
            className="lg:col-span-2"
            icon={<Coins className="h-5 w-5" />}
            iconColor={C.blue}
            title="Coin-økonomi"
            description="Fansen tjener coins ved å delta. Du designer butikken og belønningene."
          />

          <FeatureCard
            className="lg:col-span-3"
            icon={<Trophy className="h-5 w-5" />}
            iconColor={C.purple}
            title="Leaderboards og statistikk"
            description="Konkurranser og rangering motiverer fansen til å være aktive — daglig, ukentlig, all-time."
          />
          <FeatureCard
            className="lg:col-span-3"
            icon={<Sparkles className="h-5 w-5" />}
            iconColor={C.teal}
            title="Bygget for vekst"
            description="Du starter med 0 og kan vokse til 100 000+ medlemmer uten å bytte plattform."
          />
        </div>
      </section>

      {/* ── Social proof — replaces fake stats ───────────────────────────── */}
      <section className="relative py-20 px-6 sm:px-10" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.surface }}>
        <div className="mx-auto max-w-5xl text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-6"
            style={{ color: C.mint }}
          >
            For deg som tar fansen seriøst
          </p>
          <blockquote
            className="text-2xl sm:text-3xl font-medium leading-snug tracking-tight max-w-3xl mx-auto"
            style={{ color: C.cream }}
          >
            «Plattformene tjener på at fansen din ikke føler at de eier deg.
            Intraa snur det rundt — du eier relasjonen, vi gir verktøyene.»
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: `linear-gradient(135deg, ${C.teal}, ${C.purple})`,
                color:      "#FFFFFF",
              }}
            >
              B
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: C.cream }}>Brede</p>
              <p className="text-xs" style={{ color: C.muted }}>Founder, intraa</p>
            </div>
          </div>

          {/* Tiny live numbers — only shown if there's something to show */}
          {userCount > 5 && (
            <div
              className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-full px-6 py-3 text-xs"
              style={{ border: `1px solid ${C.line}`, color: C.muted }}
            >
              <span><strong style={{ color: C.cream }}>{userCount}</strong> medlemmer</span>
              <span style={{ color: C.line }}>·</span>
              <span><strong style={{ color: C.cream }}>{orgCount}</strong> communities</span>
              <span style={{ color: C.line }}>·</span>
              <span><strong style={{ color: C.cream }}>{messageCount + postCount}</strong> meldinger sendt</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="priser" className="relative mx-auto max-w-5xl px-6 sm:px-10 py-24">
        <div className="mb-14 max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: C.amber }}
          >
            Priser
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: C.cream }}>
            Start gratis. Skaler når du er klar.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Free */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: C.surface,
              border:     `1px solid ${C.line}`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
              Fan
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold" style={{ color: C.cream }}>Gratis</span>
            </div>
            <p className="text-sm mb-8" style={{ color: C.muted }}>
              For deg som vil utforske og delta i communities.
            </p>
            <ul className="space-y-3 text-sm mb-8" style={{ color: C.mutedHi }}>
              <BulletPlain>Personlig profil</BulletPlain>
              <BulletPlain>Bli med i communities</BulletPlain>
              <BulletPlain>Chat, feed og spill</BulletPlain>
              <BulletPlain>Coin-system</BulletPlain>
              <BulletPlain>Venner og DM</BulletPlain>
            </ul>
            <Link
              href="/registrer"
              className="block w-full text-center rounded-full px-5 py-3 text-sm font-semibold transition-colors"
              style={{
                border: `1px solid ${C.lineHi}`,
                color:  C.cream,
              }}
            >
              Opprett konto
            </Link>
          </div>

          {/* Creator — featured */}
          <div
            className="relative rounded-3xl p-8 overflow-hidden"
            style={{
              background: `linear-gradient(140deg, ${C.surface2} 0%, ${C.surface} 100%)`,
              border:     `1px solid ${C.purple}50`,
              boxShadow:  `0 0 60px ${C.purple}25, inset 0 0 0 1px ${C.purple}20`,
            }}
          >
            {/* Aurora accent corner — teal + purple aurora glow */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-35 blur-[60px]"
              style={{ background: `radial-gradient(circle, ${C.purple}, transparent 70%)` }}
            />
            <div
              className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-25 blur-[60px]"
              style={{ background: `radial-gradient(circle, ${C.teal}, transparent 70%)` }}
            />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.teal }}>
                  Creator
                </p>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: `${C.purple}20`,
                    color:      C.purple,
                  }}
                >
                  Mest valgt
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ color: C.text }}>Gratis</span>
                <span className="text-sm" style={{ color: C.muted }}>i åpen beta</span>
              </div>
              <p className="text-sm mb-8" style={{ color: C.muted }}>
                Alt for å bygge og monetisere fansen din.
              </p>
              <ul className="space-y-3 text-sm mb-8" style={{ color: C.mutedHi }}>
                <BulletAccent color={C.teal}>Eget community med egen URL</BulletAccent>
                <BulletAccent color={C.teal}>Twitch / YouTube live-integrasjon</BulletAccent>
                <BulletAccent color={C.teal}>Fanpass — selg betalt medlemskap</BulletAccent>
                <BulletAccent color={C.teal}>Coin-shop og lojalitetssystem</BulletAccent>
                <BulletAccent color={C.teal}>Spill, leaderboards og konkurranser</BulletAccent>
                <BulletAccent color={C.teal}>Admin-panel og statistikk</BulletAccent>
              </ul>
              {/* White CTA per Aurora spec */}
              <Link
                href="/registrer"
                className="block w-full text-center rounded-full px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/90"
                style={{
                  background: "#FFFFFF",
                  color:      C.bg,
                }}
              >
                Start ditt community →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative px-6 sm:px-10 pb-24">
        <div
          className="mx-auto max-w-5xl rounded-3xl px-8 py-16 sm:px-16 sm:py-20 text-center relative overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at 30% top, ${C.teal}20, transparent 60%), radial-gradient(ellipse at 70% top, ${C.purple}25, transparent 60%), ${C.surface}`,
            border:     `1px solid ${C.lineHi}`,
          }}
        >
          <h3
            className="text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto"
            style={{ color: C.text }}
          >
            Klar til å eie fansen din?
          </h3>
          <p className="mt-5 text-base" style={{ color: C.mutedHi }}>
            Bygg et community som vokser med deg.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/registrer"
              className="group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-white/90"
              style={{
                background: "#FFFFFF",
                color:      C.bg,
              }}
            >
              Start gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative px-6 sm:px-10 pb-12 pt-6" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-10">
          <div className="flex items-center gap-2">
            {/* Glass logo per Aurora spec */}
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black"
              style={{
                background:           "rgba(255,255,255,0.10)",
                border:               "0.5px solid rgba(255,255,255,0.20)",
                backdropFilter:       "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color:                "#fff",
              }}
            >
              i
            </span>
            <span className="text-sm font-bold" style={{ color: C.text }}>intraa</span>
            <span className="text-xs ml-2" style={{ color: C.muted }}>· din community-plattform</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: C.muted }}>
            <Link href="#funksjoner">Funksjoner</Link>
            <Link href="#priser">Priser</Link>
            <Link href="/login">Logg inn</Link>
            <Link href="/registrer">Registrer</Link>
            <Link href="/terms">Vilkår</Link>
            <Link href="/privacy">Personvern</Link>
          </div>
        </div>
        <p className="mt-10 text-center text-xs" style={{ color: C.muted, opacity: 0.6 }}>
          © {new Date().getFullYear()} Intraa · Laget i Norge
        </p>
      </footer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Feature card                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function FeatureCard({
  className = "",
  icon,
  iconColor,
  title,
  description,
  featured,
  children,
}: {
  className?:   string;
  icon:         React.ReactNode;
  iconColor:    string;
  title:        string;
  description:  string;
  featured?:    boolean;
  children?:    React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 transition-colors ${className}`}
      style={{
        background: featured
          ? `linear-gradient(140deg, ${C.surface2} 0%, ${C.surface} 100%)`
          : C.surface,
        border:     `1px solid ${C.line}`,
      }}
    >
      <div
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl mb-4"
        style={{
          background: `${iconColor}15`,
          color:      iconColor,
          border:     `1px solid ${iconColor}25`,
        }}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5" style={{ color: C.cream }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Bullet helpers                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function BulletPlain({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="h-1 w-1 rounded-full shrink-0" style={{ background: C.muted }} />
      {children}
    </li>
  );
}

function BulletAccent({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span>{children}</span>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero mock — floating composition showing chat + coins + live              */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroMock() {
  return (
    <div className="relative">

      {/* LIVE badge — pink per Aurora spec */}
      <div
        className="absolute -top-3 left-6 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{
          background:  C.surface,
          border:      `1px solid ${C.pink}40`,
          color:       C.text,
          boxShadow:   `0 8px 24px ${C.pink}30`,
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: C.pink }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: C.pink }} />
        </span>
        LIVE · 1 187 ser på
      </div>

      {/* Main mock card — glass panel per Aurora spec */}
      <div
        className="relative rounded-2xl p-5 shadow-2xl glass-panel"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border:     "0.5px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <span className="ml-3 text-[11px]" style={{ color: C.muted }}>community/chat</span>
        </div>

        {/* Chat messages — distributed across Aurora palette per spec */}
        <div className="space-y-3">
          <MockMsg name="ola"      color={C.teal}   text="haha gg hva var det trekket" />
          <MockMsg name="kari_"    color={C.pink}   text="strøm i morra også?" fanpass />
          <MockMsg name="Lars_TV"  color={C.purple} text="nytt brett er sjukkt" fanpass />
          <MockMsg name="sara"     color={C.blue}   text="tapte mot bot på 4 trekk lmao" />
        </div>

        {/* Input row */}
        <div
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: C.bg, border: `1px solid ${C.line}` }}
        >
          <span className="text-xs flex-1" style={{ color: C.muted }}>Skriv en melding…</span>
          <Send className="h-3.5 w-3.5" style={{ color: C.muted }} />
        </div>
      </div>

      {/* Coin widget — teal→purple aurora gradient */}
      <div
        className="absolute -bottom-5 -right-3 z-10 rounded-2xl px-4 py-3 shadow-2xl"
        style={{
          background: C.surface,
          border:     `1px solid ${C.teal}40`,
          boxShadow:  `0 12px 32px ${C.purple}25`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${C.teal}, ${C.purple})`,
              color:      "#FFFFFF",
            }}
          >
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Coins</p>
            <p className="text-base font-bold leading-tight" style={{ color: C.text }}>12 480</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockMsg({ name, color, text, fanpass }: { name: string; color: string; text: string; fanpass?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: `${color}20`, color }}
      >
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold" style={{ color: C.cream }}>{name}</span>
          {fanpass && (
            <span
              className="text-[11px]"
              style={{ color: C.amber, filter: `drop-shadow(0 0 3px ${C.amber}50)` }}
              title="Fanpass-medlem"
            >
              ♛
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed mt-0.5" style={{ color: C.mutedHi }}>{text}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Live feature mock                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function LiveMock() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: C.bg, border: `1px solid ${C.line}` }}
    >
      {/* "Video" area — aurora gradient backdrop */}
      <div
        className="relative h-32 sm:h-36"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${C.purple}35, transparent 60%),
                       radial-gradient(circle at 70% 60%, ${C.teal}30, transparent 60%),
                       ${C.surface2}`,
        }}
      >
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: C.pink, color: "#FFFFFF" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <span className="text-[10px]" style={{ color: C.text }}>1 240 ser på</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-xs font-semibold truncate" style={{ color: C.text }}>
          Late night sjakk-strøm 🌙
        </div>
      </div>
      {/* Chat preview strip */}
      <div className="px-3 py-2 flex items-center gap-2 text-[11px]" style={{ borderTop: `1px solid ${C.line}` }}>
        <span style={{ color: C.purple }}>♛ Kari:</span>
        <span style={{ color: C.muted }}>GG, det var sjukt 🔥</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Fanpass feature mock                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function FanpassMock() {
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${C.purple}15, ${C.pink}10)`,
        border:     `1px solid ${C.purple}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xl"
          style={{ color: C.purple, filter: `drop-shadow(0 0 8px ${C.purple}80)` }}
        >
          ♛
        </span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.purple }}>
          Fanpass
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: C.text }}>
        49<span className="text-sm font-normal" style={{ color: C.muted }}> kr/mnd</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-xs" style={{ color: C.mutedHi }}>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full" style={{ background: C.purple }} />
          ♛ Synlig badge
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full" style={{ background: C.teal }} />
          Eksklusive bretttema
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full" style={{ background: C.blue }} />
          Lukkede kanaler
        </li>
      </ul>
    </div>
  );
}
