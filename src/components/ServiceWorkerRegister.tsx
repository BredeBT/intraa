"use client";

import { useEffect } from "react";

/**
 * Registrerer /sw.js på alle page-loads slik at app-shell caches og
 * /offline-fallback fungerer selv før brukeren har aktivert push.
 *
 * NB: Service Worker hopper over registrering på localhost/dev så vi
 * ikke får cache-rusk under utvikling. Vercel preview + prod kjører
 * den normalt.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Hopp over i dev — Hot Module Reload + SW = lite gøy
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Sjekk for ny versjon hver 60 min mens appen er åpen
        setInterval(() => { void reg.update(); }, 60 * 60 * 1000);
      })
      .catch((err) => console.warn("[sw] registration failed:", err));
  }, []);

  return null;
}
