"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { Newspaper, Crown, Gamepad2, ChevronDown } from "lucide-react";

/**
 * Scroll-driven "app tour" — tre kapitler (Feed, Broadcast, Clicker)
 * som tar over skjermen mens brukeren bla'r. Hver seksjon har sticky
 * tekst-rute til venstre og mock-skjerm til høyre som glir inn.
 *
 * Dette gir den teaser-følelsen av at noen drar deg gjennom appen,
 * uten å gå over til full scrollytelling-overkill.
 */

const C = {
  bg:     "#050816",
  text:   "#F0F4FF",
  muted:  "rgba(255,255,255,0.55)",
  teal:   "#5EEAD4",
  purple: "#A855F7",
  blue:   "#60A5FA",
  pink:   "#F472B6",
  amber:  "#FBBF24",
  surface: "#0B1027",
  line:    "rgba(240,244,255,0.10)",
} as const;

interface Chapter {
  eyebrow:  string;
  title:    string;
  body:     string;
  icon:     React.ComponentType<{ className?: string }>;
  accent:   string;
  mock:     ReactNode;
}

const CHAPTERS: Chapter[] = [
  {
    eyebrow: "Feed",
    title:   "Daglig puls i communityet",
    body:    "Innlegg, kommentarer, likes, bilder — der hvor medlemmene faktisk henger sammen mellom store events. Rich-text, emojis, GIFs, vis-mer-collapse for lengre posts.",
    icon:    Newspaper,
    accent:  C.blue,
    mock:    <FeedMock />,
  },
  {
    eyebrow: "Innenfor-sirkelen",
    title:   "Ditt private rom for ♛-medlemmer",
    body:    "Eksklusiv broadcast-kanal hvor du sender personlige oppdateringer, voice-notes, stories og sneak-peeks som kun Fanpass-medlemmer ser. Tett, ekte, premium.",
    icon:    Crown,
    accent:  C.purple,
    mock:    <BroadcastMock />,
  },
  {
    eyebrow: "Klikker-spillet",
    title:   "Lim som holder dem tilbake",
    body:    "Idle-spill bygd inn i hvert community — progressiv coin-økonomi, 9 verdener med prestige-system, daglig streak. Det er gøy alene, det blir vanedannende sammen.",
    icon:    Gamepad2,
    accent:  C.teal,
    mock:    <ClickerMock />,
  },
];

export default function AppTour() {
  return (
    <section className="relative" style={{ background: C.bg }}>
      {/* Section-intro */}
      <div className="mx-auto max-w-6xl px-6 sm:px-10 pt-24 pb-16 text-center">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-3"
          style={{ color: C.teal }}
        >
          En kort rundtur
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: C.text }}>
          Tre rom som jobber sammen
        </h2>
        <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
          Hvert community får disse byggesteinene som standard. Du kan skru av
          det du ikke trenger.
        </p>

        {/* Scroll-hint */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[11px]" style={{ color: "rgba(240,244,255,0.35)" }}>Scroll</span>
          <ChevronDown className="h-4 w-4" style={{ color: "rgba(240,244,255,0.35)" }} />
        </motion.div>
      </div>

      {/* Chapters */}
      {CHAPTERS.map((ch, i) => (
        <Chapter key={ch.eyebrow} chapter={ch} index={i} isLast={i === CHAPTERS.length - 1} />
      ))}
    </section>
  );
}

function Chapter({ chapter, index, isLast }: { chapter: Chapter; index: number; isLast: boolean }) {
  const ref     = useRef<HTMLDivElement>(null);
  const reduce  = useReducedMotion();
  const Icon    = chapter.icon;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Mock glir inn fra siden + mild rotate
  const mockX     = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -20]);
  const mockOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.6]);
  const mockRot   = useTransform(scrollYProgress, [0, 0.5, 1], [3, 0, -2]);

  // Tekst kommer inn fra venstre
  const textX     = useTransform(scrollYProgress, [0, 0.5], [-30, 0]);
  const textOp    = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  // Vis annenhver seksjon med mock på motsatt side for variasjon
  const reverse = index % 2 === 1;

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 sm:px-10 py-24 md:py-32"
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}>
        {/* Tekst */}
        <motion.div
          style={reduce ? undefined : { x: textX, opacity: textOp }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] mb-5"
            style={{
              background: `${chapter.accent}15`,
              color:      chapter.accent,
              border:     `1px solid ${chapter.accent}30`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {chapter.eyebrow}
          </div>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-5 leading-tight" style={{ color: C.text }}>
            {chapter.title}
          </h3>
          <p className="text-base sm:text-lg leading-relaxed max-w-md" style={{ color: C.muted }}>
            {chapter.body}
          </p>
        </motion.div>

        {/* Mock */}
        <motion.div
          className="relative"
          style={reduce ? undefined : { x: mockX, opacity: mockOpacity, rotate: mockRot }}
        >
          {/* Glow bak mock */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl blur-[60px] opacity-40"
            style={{
              background: `radial-gradient(circle at center, ${chapter.accent}, transparent 70%)`,
            }}
          />
          <div className="relative">
            {chapter.mock}
          </div>
        </motion.div>
      </div>

      {/* Tynn divider mellom kapittel, ikke på siste */}
      {!isLast && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-32"
          style={{ background: `linear-gradient(90deg, transparent, ${C.line}, transparent)` }}
        />
      )}
    </div>
  );
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function FeedMock() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.surface,
        border:     `1px solid ${C.line}`,
        boxShadow:  "0 24px 64px rgba(0,0,0,0.6)",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: C.line }}>
        <p className="text-xs font-semibold" style={{ color: C.muted }}>Feed · Intraa</p>
      </div>
      <div className="p-4 space-y-3">
        <Post name="Mia Askvik" color={C.pink} text="Ny video ute! Stort takk til alle som har holdt ut med produksjonen 🎬" likes={47} comments={12} fanpass />
        <Post name="Sander"     color={C.blue} text="Helgens streaming-schedule er ute — sjekk Live-fanen!" likes={23} comments={5} />
        <Post name="Brede"      color={C.purple} text="Endring i medlemskaps-tier kommer neste uke. Tråd i innenfor-sirkelen om hva det betyr for dere." likes={89} comments={31} fanpass />
      </div>
    </div>
  );
}

function Post({
  name, color, text, likes, comments, fanpass,
}: {
  name:     string;
  color:    string;
  text:     string;
  likes:    number;
  comments: number;
  fanpass?: boolean;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: color, color: "#fff" }}
        >
          {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <span className="text-xs font-semibold" style={{ color: C.text }}>{name}</span>
        {fanpass && (
          <span style={{ color: C.purple, fontSize: 11, filter: `drop-shadow(0 0 3px ${C.purple}80)` }}>♛</span>
        )}
      </div>
      <p className="text-xs leading-relaxed mb-2" style={{ color: C.muted }}>{text}</p>
      <div className="flex gap-3 text-[10px]" style={{ color: "rgba(240,244,255,0.30)" }}>
        <span>❤ {likes}</span>
        <span>💬 {comments}</span>
      </div>
    </div>
  );
}

function BroadcastMock() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.surface,
        border:     `1px solid rgba(168,85,247,0.25)`,
        boxShadow:  "0 24px 64px rgba(168,85,247,0.20)",
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: C.line, background: "linear-gradient(135deg, rgba(94,234,212,0.06), rgba(168,85,247,0.10))" }}
      >
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
        >
          ♛
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: C.text }}>innenfor-sirkelen</p>
          <p className="text-[10px]" style={{ color: C.teal }}>♛ Fanpass-broadcast</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: C.text }}>Mia Askvik</span>
            <span style={{ color: C.purple, fontSize: 10 }}>♛</span>
            <span className="text-[10px]" style={{ color: "rgba(240,244,255,0.30)" }}>14:22</span>
          </div>
          <div
            className="rounded-xl rounded-tl-sm px-3 py-2.5 text-xs leading-relaxed max-w-[85%]"
            style={{ background: "rgba(255,255,255,0.06)", color: C.text }}
          >
            Hei dere ♛! Eksklusiv sneak-peek på neste prosjekt under — kan ikke vente til dere får se det 🎬
          </div>
        </div>
        {/* Voice-note */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: C.text }}>Mia Askvik</span>
            <span style={{ color: C.purple, fontSize: 10 }}>♛</span>
            <span className="text-[10px]" style={{ color: "rgba(240,244,255,0.30)" }}>14:23</span>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[75%]"
            style={{ background: "rgba(168,85,247,0.10)", border: `1px solid rgba(168,85,247,0.20)` }}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)" }}
            >
              <span style={{ color: "#fff", fontSize: 12 }}>▶</span>
            </div>
            <div className="flex-1 flex gap-0.5 items-center">
              {Array.from({ length: 18 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width:  2,
                    height: 4 + ((i * 5) % 14),
                    background: i < 5 ? C.purple : "rgba(168,85,247,0.30)",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: C.muted }}>0:42</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClickerMock() {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #050816 0%, #131A35 100%)",
        border:     `1px solid ${C.line}`,
        boxShadow:  "0 24px 64px rgba(94,234,212,0.18)",
      }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: C.line }}>
        <p className="text-xs font-semibold" style={{ color: C.text }}>Skog · Verden 3</p>
        <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: C.amber }}>
          <span>🪙</span> 12 480
        </div>
      </div>
      <div className="p-6 flex flex-col items-center">
        {/* Klikk-sirkel */}
        <motion.div
          className="relative h-32 w-32 mb-4"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(94,234,212,0.30), rgba(168,85,247,0.15) 60%, transparent)",
              filter:     "blur(10px)",
            }}
          />
          <div
            className="relative h-full w-full rounded-full flex items-center justify-center text-4xl"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              boxShadow:  "0 12px 40px rgba(94,234,212,0.4)",
            }}
          >
            🌲
          </div>
        </motion.div>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[200px] text-center">
          <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(94,234,212,0.10)" }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: C.teal }}>Per klikk</p>
            <p className="text-sm font-bold" style={{ color: C.text }}>×4.2</p>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(168,85,247,0.10)" }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: C.purple }}>Per sek</p>
            <p className="text-sm font-bold" style={{ color: C.text }}>132</p>
          </div>
        </div>
      </div>
    </div>
  );
}
