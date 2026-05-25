"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown, Sparkles, Lock, Radio, Coins, MessageCircle, Camera,
  Check, X, ArrowRight, Calendar,
} from "lucide-react";

interface OrgInfo {
  id:      string;
  slug:    string;
  name:    string;
  logoUrl: string | null;
}

interface Props {
  org:                  OrgInfo;
  hasActiveFanpass:     boolean;
  fanpassEnd:           string | null;
  fanpassChannelCount:  number;
  totalChannelCount:    number;
  hasStreaming:         boolean;
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
} as const;

export default function FanpassWelcome({
  org, hasActiveFanpass, fanpassEnd, fanpassChannelCount, hasStreaming,
}: Props) {
  const router = useRouter();
  const [confetti, setConfetti] = useState(true);

  // La animasjonen lande før vi lar bruker dismisse
  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const endDate = fanpassEnd ? new Date(fanpassEnd) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const PERKS = [
    {
      icon:  <Lock className="h-4 w-4" />,
      color: S.purple,
      title: "Innenfor-sirkelen",
      desc:  fanpassChannelCount > 0
        ? `Tilgang til ${fanpassChannelCount} eksklusive ♛-${fanpassChannelCount === 1 ? "kanal" : "kanaler"} med broadcasts kun for medlemmer`
        : "Eksklusive ♛-kanaler med broadcasts kun for medlemmer",
    },
    {
      icon:  <Camera className="h-4 w-4" />,
      color: S.pink,
      title: "Stories i 24 timer",
      desc:  "Se behind-the-scenes-stories som forsvinner etter ett døgn",
    },
    {
      icon:  <Coins className="h-4 w-4" />,
      color: S.amber,
      title: "1,5× coin-bonus",
      desc:  "Du tjener 50% mer coins på alle aktiviteter — innlegg, spill, daglig streak",
    },
    {
      icon:  <Crown className="h-4 w-4" />,
      color: S.teal,
      title: "♛-merket synlig",
      desc:  "Andre medlemmer ser kronen din i feeden og meldinger — du støtter creatoren",
    },
    {
      icon:  <Radio className="h-4 w-4" />,
      color: hasStreaming ? S.blue : S.subtle,
      title: "Prioritet i live-events",
      desc:  hasStreaming
        ? "Fanpass-medlemmer har bedre vinnersjanse i giveaways og kommer foran i live-køer"
        : "Når creatoren går live, har du prioritert tilgang til giveaways og polls",
    },
    {
      icon:  <MessageCircle className="h-4 w-4" />,
      color: S.purple,
      title: "Nærmere creatoren",
      desc:  "Reager med eksklusive emojis, send broadcast-reaksjoner og bli sett",
    },
  ];

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      {/* Lukk-knapp øverst til høyre */}
      <button
        onClick={() => router.back()}
        className="absolute right-4 top-4 md:right-6 md:top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
        style={{ background: S.surface, border: `1px solid ${S.line}`, color: S.muted }}
        aria-label="Lukk"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Hero-kort */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(94,234,212,0.10) 0%, rgba(168,85,247,0.16) 50%, rgba(96,165,250,0.10) 100%)",
          border:     "1px solid rgba(168,85,247,0.30)",
        }}
      >
        {/* Bakgrunns-glow */}
        <div
          aria-hidden
          className="absolute -top-32 -right-20 h-72 w-72 rounded-full opacity-60 blur-[100px]"
          style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-16 h-60 w-60 rounded-full opacity-50 blur-[90px]"
          style={{ background: "radial-gradient(circle, #5EEAD4, transparent 70%)" }}
        />

        {/* Confetti-sparkles */}
        {confetti && (
          <>
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                aria-hidden
                className="absolute h-3 w-3 animate-ping"
                style={{
                  top:    `${15 + (i * 7) % 60}%`,
                  left:   `${10 + (i * 11) % 80}%`,
                  color:  [S.teal, S.purple, S.amber, S.pink][i % 4],
                  animationDelay:    `${i * 100}ms`,
                  animationDuration: "1.2s",
                }}
              />
            ))}
          </>
        )}

        <div className="relative text-center">
          {/* Crown med pulserende ring */}
          <div className="relative mx-auto mb-5 inline-block">
            <div
              aria-hidden
              className="absolute inset-0 rounded-3xl animate-pulse"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                opacity:    0.4,
                filter:     "blur(8px)",
              }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl text-5xl"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                color:      "#FFFFFF",
                boxShadow:  "0 20px 60px rgba(168,85,247,0.5)",
              }}
            >
              ♛
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-1" style={{ color: S.teal }}>
            {hasActiveFanpass ? "Fanpass aktivert" : "Fanpass"}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: S.text }}>
            {hasActiveFanpass ? (
              <>Velkommen til <span style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }}>{org.name}</span></>
            ) : (
              <>Bli Fanpass-medlem i {org.name}</>
            )}
          </h1>
          <p className="text-sm md:text-base mb-6 leading-relaxed max-w-lg mx-auto" style={{ color: S.muted }}>
            {hasActiveFanpass
              ? "Du er nå en del av innerste sirkelen — her er alt som er låst opp for deg:"
              : "Få tilgang til eksklusivt innhold, stories og en direkte linje til creatoren."}
          </p>

          {hasActiveFanpass && daysLeft !== null && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                background: "rgba(94,234,212,0.10)",
                color:      S.teal,
                border:     `1px solid rgba(94,234,212,0.25)`,
              }}
            >
              <Calendar className="h-3 w-3" />
              {daysLeft > 30
                ? `Aktiv ut ${endDate?.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}`
                : `${daysLeft} ${daysLeft === 1 ? "dag" : "dager"} igjen`
              }
            </div>
          )}
        </div>
      </div>

      {/* Perks-grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: S.muted }}>
          Hva som er låst opp
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{
                background: S.surface,
                border:     `1px solid ${S.line}`,
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `${perk.color}15`,
                  color:      perk.color,
                  border:     `1px solid ${perk.color}30`,
                }}
              >
                {perk.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold" style={{ color: S.text }}>{perk.title}</p>
                  {hasActiveFanpass && <Check className="h-3.5 w-3.5" style={{ color: S.teal }} />}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: S.muted }}>{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA-rad */}
      {hasActiveFanpass ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/${org.slug}/feed`}
            className="flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              color:      "#FFFFFF",
              boxShadow:  "0 8px 24px rgba(168,85,247,0.4)",
            }}
          >
            <Sparkles className="h-4 w-4" />
            Gå til {org.name}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => router.back()}
            className="rounded-full px-6 py-3 text-sm font-medium transition-colors"
            style={{
              background: S.surface2,
              color:      S.muted,
              border:     `1px solid ${S.line}`,
            }}
          >
            Tilbake
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xs mb-3" style={{ color: S.subtle }}>
            Fanpass-betaling kommer snart — kontakt creatoren direkte hvis du vil bli medlem nå.
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-full px-6 py-3 text-sm font-medium transition-colors"
            style={{
              background: S.surface2,
              color:      S.muted,
              border:     `1px solid ${S.line}`,
            }}
          >
            Tilbake
          </button>
        </div>
      )}
    </div>
  );
}
