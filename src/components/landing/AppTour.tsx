"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { Newspaper, Crown, Gamepad2, Mic, Heart, MessageCircle } from "lucide-react";

/**
 * Pinned phone-tour for landing-page.
 *
 * Konsept: én sticky telefon-mockup som morfer innholdet (Feed → Broadcast →
 * Klikker) mens brukeren scroller. Føles som om du står og ser noen bruke
 * appen. Skalerer naturlig til mobil siden mockup-en allerede er en phone.
 *
 * Implementasjon: én tall section (~320vh) med sticky phone-frame inni. Tre
 * lag i skjermen som crossfades basert på scrollYProgress. Side-tekst gjør
 * tilsvarende crossfade.
 */

const C = {
  bg:     "#050816",
  text:   "#F0F4FF",
  muted:  "rgba(255,255,255,0.55)",
  subtle: "rgba(255,255,255,0.35)",
  teal:   "#5EEAD4",
  purple: "#A855F7",
  blue:   "#60A5FA",
  pink:   "#F472B6",
  amber:  "#FBBF24",
  surface: "#0B1027",
  line:    "rgba(240,244,255,0.10)",
} as const;

const CHAPTERS = [
  { eyebrow: "Feed",                title: "Daglig puls i communityet",      body: "Innlegg, kommentarer, likes, bilder — der hvor medlemmene faktisk henger sammen mellom store events.", icon: Newspaper, accent: C.blue },
  { eyebrow: "Innenfor-sirkelen",   title: "Ditt rom for ♛-medlemmer",       body: "Eksklusiv broadcast-kanal hvor du sender personlige oppdateringer, voice-notes og sneak-peeks som kun Fanpass-medlemmer ser.", icon: Crown,     accent: C.purple },
  { eyebrow: "Klikker-spillet",     title: "Limet som drar dem tilbake",     body: "Idle-spill bygd inn i hvert community. 9 verdener, prestige-system, daglig streak. Vanedannende sammen.", icon: Gamepad2,  accent: C.teal },
] as const;

export default function AppTour() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Tre kapittel-vinduer: 0-0.33 = Feed, 0.33-0.66 = Broadcast, 0.66-1 = Klikker
  // Crossfades med smooth bands rundt overgangene.
  const op0 = useTransform(scrollYProgress, [0.00, 0.05, 0.30, 0.40], [1, 1, 1, 0]);
  const op1 = useTransform(scrollYProgress, [0.30, 0.40, 0.62, 0.72], [0, 1, 1, 0]);
  const op2 = useTransform(scrollYProgress, [0.62, 0.72, 0.95, 1.00], [0, 1, 1, 1]);

  // Subtle "pop" på phone når kapittelet bytter
  const phoneScale = useTransform(
    scrollYProgress,
    [0.00, 0.30, 0.40, 0.62, 0.72, 1.00],
    [1.00, 1.00, 1.02, 1.00, 1.02, 1.00],
  );

  if (reduce) {
    return (
      <section className="relative py-24" style={{ background: C.bg }}>
        <Intro />
        <div className="mx-auto max-w-6xl px-6 sm:px-10 space-y-24">
          {CHAPTERS.map((ch, i) => (
            <div key={ch.eyebrow} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <SideText chapter={ch} />
              <div className="flex justify-center">
                <PhoneFrame>{i === 0 ? <FeedScreen /> : i === 1 ? <BroadcastScreen /> : <ClickerScreen />}</PhoneFrame>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative" style={{ background: C.bg, height: "320vh" }}>
      <Intro />

      {/* Sticky phone + side-tekst */}
      <div className="sticky top-0 h-screen flex items-center">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            {/* Side-tekst — crossfades mellom kapitler */}
            <div className="relative min-h-[260px] md:min-h-[320px] order-2 md:order-1">
              <ChapterText chapter={CHAPTERS[0]} opacity={op0} />
              <ChapterText chapter={CHAPTERS[1]} opacity={op1} />
              <ChapterText chapter={CHAPTERS[2]} opacity={op2} />
            </div>

            {/* Phone-mockup med tre lag */}
            <div className="flex justify-center order-1 md:order-2">
              <motion.div style={{ scale: phoneScale }}>
                <PhoneFrame>
                  <motion.div style={{ opacity: op0 }} className="absolute inset-0">
                    <FeedScreen />
                  </motion.div>
                  <motion.div style={{ opacity: op1 }} className="absolute inset-0">
                    <BroadcastScreen />
                  </motion.div>
                  <motion.div style={{ opacity: op2 }} className="absolute inset-0">
                    <ClickerScreen />
                  </motion.div>
                </PhoneFrame>
              </motion.div>
            </div>

          </div>

          {/* Progress-prikker */}
          <div className="mt-8 flex justify-center gap-2">
            <Dot opacity={op0} />
            <Dot opacity={op1} />
            <Dot opacity={op2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10 pt-24 pb-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: C.teal }}>
        En kort rundtur
      </p>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: C.text }}>
        Tre rom som jobber sammen
      </h2>
      <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
        Hvert community får disse byggesteinene som standard. Scroll for å se hver i bruk.
      </p>
    </div>
  );
}

function SideText({ chapter }: { chapter: typeof CHAPTERS[number] }) {
  const Icon = chapter.icon;
  return (
    <div>
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
    </div>
  );
}

function ChapterText({ chapter, opacity }: { chapter: typeof CHAPTERS[number]; opacity: MotionValue<number> }) {
  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <SideText chapter={chapter} />
    </motion.div>
  );
}

function Dot({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.div
      className="h-1.5 w-8 rounded-full"
      style={{
        background: C.text,
        opacity,
      }}
    />
  );
}

// ─── Phone frame ─────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden mx-auto"
      style={{
        width:      260,
        height:     540,
        background: "#000",
        borderRadius: 40,
        padding:    8,
        boxShadow:  "0 32px 80px rgba(0,0,0,0.65), 0 0 0 2px rgba(240,244,255,0.06), inset 0 0 0 2px rgba(255,255,255,0.04)",
      }}
    >
      {/* Notch */}
      <div
        aria-hidden
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{
          width:      88,
          height:     20,
          background: "#000",
          borderRadius: 12,
        }}
      />
      {/* Skjerm-container */}
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          background: C.bg,
          borderRadius: 32,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Skjerm-innhold ──────────────────────────────────────────────────────────

function FeedScreen() {
  return (
    <div className="h-full w-full">
      <div className="px-4 pt-8 pb-3 border-b" style={{ borderColor: C.line }}>
        <p className="text-[13px] font-semibold" style={{ color: C.text }}>Feed · Intraa</p>
      </div>
      <div className="p-3 space-y-2.5 overflow-hidden">
        <FakePost color={C.pink}   text="Ny video ute! Stor takk til alle som har holdt ut med produksjonen 🎬" likes={47} comments={12} fanpass />
        <FakePost color={C.blue}   text="Helgens streaming-schedule er ute — sjekk Live-fanen!"                  likes={23} comments={5} />
        <FakePost color={C.purple} text="Endring i medlemskaps-tier kommer neste uke. Tråd i innenfor-sirkelen." likes={89} comments={31} fanpass />
      </div>
    </div>
  );
}

function FakePost({ color, text, likes, comments, fanpass }: { color: string; text: string; likes: number; comments: number; fanpass?: boolean }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-full" style={{ background: color }} />
        <div className="h-2 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }} />
        {fanpass && <span style={{ color: C.purple, fontSize: 11, filter: `drop-shadow(0 0 3px ${C.purple}80)` }}>♛</span>}
      </div>
      <p className="text-[11px] leading-relaxed mb-2" style={{ color: C.muted }}>{text}</p>
      <div className="flex gap-3 text-[10px]" style={{ color: C.subtle }}>
        <span className="flex items-center gap-1"><Heart className="h-2.5 w-2.5" /> {likes}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" /> {comments}</span>
      </div>
    </div>
  );
}

function BroadcastScreen() {
  return (
    <div className="h-full w-full" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.06), transparent 50%)" }}>
      <div className="px-4 pt-8 pb-3 border-b flex items-center gap-2" style={{ borderColor: C.line, background: "linear-gradient(135deg, rgba(94,234,212,0.06), rgba(168,85,247,0.10))" }}>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff", boxShadow: "0 4px 12px rgba(168,85,247,0.35)" }}
        >
          ♛
        </div>
        <div>
          <p className="text-[12px] font-semibold" style={{ color: C.text }}>innenfor-sirkelen</p>
          <p className="text-[9px]" style={{ color: C.teal }}>♛ Fanpass-broadcast</p>
        </div>
      </div>
      <div className="p-3 space-y-3 overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-12 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: C.purple, fontSize: 10 }}>♛</span>
          </div>
          <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] leading-relaxed" style={{ background: "rgba(255,255,255,0.06)", color: C.text, maxWidth: "85%" }}>
            Eksklusiv sneak-peek på neste prosjekt 🎬
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-12 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: C.purple, fontSize: 10 }}>♛</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ background: "rgba(168,85,247,0.10)", border: `1px solid rgba(168,85,247,0.20)`, maxWidth: "80%" }}>
            <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)" }}>
              <Mic className="h-3 w-3" style={{ color: "#fff" }} />
            </div>
            <div className="flex-1 flex gap-0.5 items-center">
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} className="rounded-full" style={{
                  width:  2,
                  height: 3 + ((i * 5) % 12),
                  background: i < 4 ? C.purple : "rgba(168,85,247,0.30)",
                }} />
              ))}
            </div>
            <span className="text-[9px]" style={{ color: C.muted }}>0:42</span>
          </div>
        </div>
        <div className="flex gap-1 pl-1">
          {["❤", "🔥", "👀"].map((e, i) => (
            <div key={i} className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: "rgba(255,255,255,0.06)", color: C.text }}>
              {e} {[12, 7, 4][i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClickerScreen() {
  return (
    <div
      className="h-full w-full"
      style={{ background: "linear-gradient(180deg, #050816 0%, #131A35 100%)" }}
    >
      <div className="px-4 pt-8 pb-3 border-b flex items-center justify-between" style={{ borderColor: C.line }}>
        <div>
          <p className="text-[12px] font-semibold" style={{ color: C.text }}>Skog · Verden 3</p>
          <p className="text-[9px]" style={{ color: C.subtle }}>Per sekund: 132</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: C.amber }}>
          <span>🪙</span> 12 480
        </div>
      </div>
      <div className="p-5 flex flex-col items-center justify-center" style={{ minHeight: 380 }}>
        <div className="relative h-40 w-40 mb-5">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(94,234,212,0.30), rgba(168,85,247,0.15) 60%, transparent)",
              filter:     "blur(14px)",
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="relative h-full w-full rounded-full flex items-center justify-center text-5xl"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              boxShadow:  "0 16px 48px rgba(94,234,212,0.4)",
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            🌲
          </motion.div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="rounded-lg px-3 py-2" style={{ background: "rgba(94,234,212,0.10)", border: `1px solid rgba(94,234,212,0.20)` }}>
            <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: C.teal }}>Per klikk</p>
            <p className="text-sm font-bold" style={{ color: C.text }}>×4.2</p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: "rgba(168,85,247,0.10)", border: `1px solid rgba(168,85,247,0.20)` }}>
            <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: C.purple }}>Prestige</p>
            <p className="text-sm font-bold" style={{ color: C.text }}>Lv 2</p>
          </div>
        </div>
        <div className="w-full mt-4">
          <div className="flex justify-between text-[8px] mb-1" style={{ color: C.subtle }}>
            <span>Neste oppgradering</span>
            <span>62%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: "62%", background: "linear-gradient(90deg, #5EEAD4, #A855F7)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
