"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface Props {
  /** Unik nøkkel — brukes for dismiss-state i localStorage */
  storageKey: string;
  /** Subtekst som beskriver konteksten ("1,5× klikk og 2× passiv inntekt") */
  perk: string;
}

/**
 * Subtil, dismissible Fanpass-hint. Vises kun hvis brukeren har minst ett
 * community uten aktivt Fanpass (vi henter portfolioen) OG hint-en ikke
 * allerede er lukket i denne nettleseren.
 *
 * Filosofi: én linje, lav opacity, ingen banner/popup. Skal ikke irritere.
 */
export default function FanpassHint({ storageKey, perk }: Props) {
  const [show,     setShow]     = useState(false);
  const [checked,  setChecked]  = useState(false);

  useEffect(() => {
    let alive = true;
    const key = `fp_hint_dismissed:${storageKey}`;
    try {
      if (localStorage.getItem(key) === "1") {
        setChecked(true);
        return;
      }
    } catch { /* localStorage utilgjengelig */ }

    fetch("/api/user/fanpass-portfolio")
      .then((r) => r.ok ? r.json() as Promise<{ communities: { hasFanpass: boolean }[] }> : Promise.reject())
      .then((d) => {
        if (!alive) return;
        // Vis kun hvis det finnes minst ett community brukeren KAN aktivere Fanpass i
        const canActivate = d.communities.some((c) => !c.hasFanpass);
        setShow(canActivate);
        setChecked(true);
      })
      .catch(() => { if (alive) setChecked(true); });

    return () => { alive = false; };
  }, [storageKey]);

  function dismiss() {
    try { localStorage.setItem(`fp_hint_dismissed:${storageKey}`, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  if (!checked || !show) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
      style={{
        background: "rgba(168,85,247,0.06)",
        border:     "1px solid rgba(168,85,247,0.15)",
        color:      "var(--text-secondary)",
      }}
    >
      <span className="text-sm">♛</span>
      <span className="flex-1">
        <Link
          href="/innstillinger?tab=fanpass"
          className="underline decoration-dotted underline-offset-2 transition-colors hover:opacity-90"
          style={{ color: "#A855F7" }}
        >
          Med Fanpass
        </Link>
        {": "}
        <span style={{ color: "rgba(240,244,255,0.7)" }}>{perk}</span>
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/5"
        style={{ color: "var(--text-tertiary)" }}
        aria-label="Skjul"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
