"use client";

import { useEffect, useState } from "react";

/**
 * Detekterer om mobiltastatur er oppe via visualViewport-API.
 *
 * iOS-spesifikk fallgruve: window.innerHeight kan også krympe når keyboardet
 * vises, så delta mot innerHeight blir 0 og fanger ikke endringen. Husker
 * heller den største visualViewport.height vi har sett som baseline (= ingen
 * keyboard) og sammenligner senere målinger mot den. Baseline oppdateres
 * hvis viewporten vokser (orientation-change).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    let baseline = vv.height;
    const check = () => {
      const h = vv.height;
      if (h > baseline) baseline = h;       // keyboard gikk ned eller rotasjon
      setOpen(baseline - h > 150);
    };
    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);    // iOS fyrer scroll når keyboard shifter
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, []);
  return open;
}
