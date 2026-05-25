"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Wirer Capacitor-spesifikke event-handlers når appen kjører som native app
 * (iOS/Android). På web er denne en no-op fordi @capacitor/*-plugins ikke
 * lastes ved at vi sjekker `Capacitor.isNativePlatform()` først.
 *
 * Det den gjør:
 *  1. Lytter til `appUrlOpen` — fyres når iOS/Android åpner appen via
 *     universal link (f.eks. tap på https://intraa.net/meldinger/mia i Mail).
 *     Vi parser URL-en og navigerer riktig i WebViewen istedenfor å bare
 *     hoppe til hjem-siden.
 *  2. Setter en `data-platform`-attributt på <html> så CSS kan tilpasse seg
 *     native vs. web (f.eks. ekstra padding for iOS status bar).
 *  3. Registrerer for native push (FCM/APNs) og sender device-token til
 *     /api/push/subscribe så serveren kan sende notifikasjoner.
 */
export default function CapacitorBridge() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      if (typeof window === "undefined") return;

      const isNative = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
        .Capacitor?.isNativePlatform?.() ?? false;
      if (!isNative) return;

      document.documentElement.setAttribute("data-platform", "native");

      // ─── 1. Universal links ─────────────────────────────────────────────
      try {
        const { App } = await import("@capacitor/app");
        const urlHandle = await App.addListener("appUrlOpen", (event) => {
          if (cancelled) return;
          try {
            const url = new URL(event.url);
            if (!/(^|\.)intraa\.net$/.test(url.hostname)) return;
            const target = url.pathname + url.search + url.hash;
            router.push(target);
          } catch { /* ugyldig URL */ }
        });
        cleanups.push(() => { void urlHandle.remove(); });
      } catch (err) {
        console.warn("[capacitor] App plugin failed:", err);
      }

      // ─── 2. Native push notifications ───────────────────────────────────
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const platform = (window as unknown as { Capacitor: { getPlatform: () => string } })
          .Capacitor.getPlatform(); // "ios" | "android" | "web"

        // Be om tillatelse — første gang viser iOS/Android system-prompt.
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== "granted") return;
        } else if (perm.receive !== "granted") {
          return;
        }

        // Token-callback — sender til server slik at vi kan pushe til denne enheten.
        const regHandle = await PushNotifications.addListener("registration", async (token) => {
          if (cancelled) return;
          try {
            await fetch("/api/push/subscribe", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ platform, token: token.value }),
            });
          } catch (err) {
            console.warn("[push] failed to register token:", err);
          }
        });
        cleanups.push(() => { void regHandle.remove(); });

        // Når bruker tapper på en push-notif → naviger til href hvis vedlagt
        const tapHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          if (cancelled) return;
          const url = action.notification.data?.url;
          if (typeof url === "string") router.push(url);
        });
        cleanups.push(() => { void tapHandle.remove(); });

        await PushNotifications.register();
      } catch (err) {
        console.warn("[capacitor] PushNotifications init failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
