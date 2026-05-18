"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommunityAccessMode } from "@prisma/client";
import { Users, Sparkles, Lock, Check, AlertTriangle, Radio } from "lucide-react";
import { setAccessMode } from "@/server/actions/communityAccess";

interface ModeOption {
  id:           CommunityAccessMode;
  label:        string;
  tagline:      string;
  description:  string;
  icon:         React.ElementType;
  color:        string;
  bullets:      string[];
  bestFor:      string;
}

const MODES: ModeOption[] = [
  {
    id:          "OPEN",
    label:       "Åpen",
    tagline:     "Gratis å bli med, ingen Fanpass",
    description: "Hele communityet er gratis. Fanpass-relaterte funksjoner skjules.",
    icon:        Users,
    color:       "#4ecdc4",
    bullets: [
      "Alle kan bli medlem uten kostnad",
      "Ingen Fanpass-kanaler eller -fordeler",
      "Bra for å bygge publikum først",
    ],
    bestFor: "Nye creators som vil bygge fanbase før de monetiserer.",
  },
  {
    id:          "FREEMIUM",
    label:       "Freemium",
    tagline:     "Gratis å bli med, Fanpass låser opp ekstra",
    description: "Standard for de fleste. Alle får tilgang til chat, feed og spill. Fanpass selger broadcast-kanal, eksklusive temaer og badges.",
    icon:        Sparkles,
    color:       "#f7b733",
    bullets: [
      "Gratis å bli med — lav terskel",
      "Fanpass låser opp broadcast-kanal, ♛-badge og mer",
      "Gradvis monetisering: gratis fans → betalende superfans",
    ],
    bestFor: "Etablerte creators som vil ha både gratis og betalende fans.",
  },
  {
    id:          "EXCLUSIVE",
    label:       "Eksklusiv",
    tagline:     "Fanpass kreves for å bli medlem",
    description: "Hele communityet er bak betalingsvegg. Som Skool, Whop eller en betalt Patreon-tier.",
    icon:        Lock,
    color:       "#ff6b35",
    bullets: [
      "Bare betalende Fanpass-medlemmer kommer inn",
      "Eksisterende medlemmer beholder tilgangen",
      "Høyere inntekt per medlem, mindre volum",
    ],
    bestFor: "Coaches, mastermind-grupper, premium-content creators.",
  },
];

export default function AccessModePicker({
  orgSlug,
  currentMode,
  memberCount,
  fanpassCount,
  broadcastChannelName,
}: {
  orgSlug:              string;
  currentMode:          CommunityAccessMode;
  memberCount:          number;
  fanpassCount:         number;
  broadcastChannelName: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CommunityAccessMode>(currentMode);
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState<CommunityAccessMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isExclusiveSwitch = (next: CommunityAccessMode) =>
    next === "EXCLUSIVE" && currentMode !== "EXCLUSIVE" && memberCount > fanpassCount;

  function handleSelect(next: CommunityAccessMode) {
    setError(null);
    if (next === currentMode) return;

    // Confirm if switching to EXCLUSIVE while non-Fanpass members exist
    if (isExclusiveSwitch(next)) {
      setShowConfirm(next);
      return;
    }
    save(next);
  }

  function save(next: CommunityAccessMode) {
    setShowConfirm(null);
    startTransition(async () => {
      const result = await setAccessMode(orgSlug, next);
      if (result.success) {
        setSelected(next);
        setSavedAt(Date.now());
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">

      {/* Status banner */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="text-zinc-400">Medlemmer:</span>
          <span className="font-semibold text-white">{memberCount}</span>
        </div>
        <span className="text-zinc-700">·</span>
        <div className="flex items-center gap-2">
          <span style={{ color: "#f7b733" }}>♛</span>
          <span className="text-zinc-400">Aktive Fanpass:</span>
          <span className="font-semibold text-white">{fanpassCount}</span>
        </div>
        {broadcastChannelName && (
          <>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4" style={{ color: "#ff6b35" }} />
              <span className="text-zinc-400">Broadcast-kanal:</span>
              <span className="font-semibold text-white">#{broadcastChannelName}</span>
            </div>
          </>
        )}
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 gap-3">
        {MODES.map((mode) => {
          const Icon       = mode.icon;
          const isSelected = selected === mode.id;
          const isCurrent  = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelect(mode.id)}
              disabled={pending}
              className="group relative text-left rounded-2xl border p-5 transition-all hover:bg-white/[0.04] disabled:opacity-60"
              style={{
                borderColor:     isSelected ? mode.color : "rgba(255,255,255,0.10)",
                background:      isSelected ? `${mode.color}10` : "rgba(255,255,255,0.02)",
                boxShadow:       isSelected ? `0 0 0 1px ${mode.color}40` : undefined,
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `${mode.color}15`,
                    color:      mode.color,
                    border:     `1px solid ${mode.color}30`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white">{mode.label}</span>
                    {isCurrent && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: `${mode.color}25`, color: mode.color }}
                      >
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">{mode.tagline}</p>

                  <ul className="space-y-1.5 mb-3">
                    {mode.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span
                          className="mt-1 h-1 w-1 rounded-full shrink-0"
                          style={{ background: mode.color }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-zinc-500 italic">{mode.bestFor}</p>
                </div>

                {isSelected && !pending && (
                  <Check className="h-5 w-5 shrink-0" style={{ color: mode.color }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Saved indicator */}
      {savedAt && Date.now() - savedAt < 3000 && (
        <p className="text-xs text-emerald-400">✓ Tilgangsmodus oppdatert</p>
      )}

      {/* Confirm modal for switching to EXCLUSIVE */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-2xl p-6"
            style={{ background: "#1a1213", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,107,53,0.15)", color: "#ff6b35" }}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Bytte til Eksklusiv?</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              Du har {memberCount - fanpassCount} medlemmer uten Fanpass. De beholder
              tilgangen sin (grandfathered), men <strong className="text-white">nye signups</strong> kan ikke bli
              medlem uten å kjøpe Fanpass først.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => save(showConfirm)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: "#ff6b35", color: "#0d0809" }}
              >
                {pending ? "Lagrer…" : "Ja, bytt til Eksklusiv"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
