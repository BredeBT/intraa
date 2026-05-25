import "server-only";
import webpush from "web-push";
import { db } from "@/server/db";

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!, // mailto:brede_bt@hotmail.com
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  icon?: string;
}

/**
 * Sender push til ALLE brukerens subscriptions — Web Push (browsers),
 * og senere FCM/APNs (native app) når Firebase Admin er satt opp.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const webSubs    = subs.filter((s) => s.platform === "web" && s.p256dh && s.auth);
  const nativeSubs = subs.filter((s) => s.platform === "ios" || s.platform === "android");

  // ─── Web Push ────────────────────────────────────────────────────────────
  const webResults = await Promise.allSettled(
    webSubs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh!, auth: sub.auth! } },
        JSON.stringify({
          title: payload.title,
          body:  payload.body,
          url:   payload.url  ?? "/",
          icon:  payload.icon ?? "/icon-192x192.png",
        }),
      ),
    ),
  );

  for (let i = 0; i < webResults.length; i++) {
    const result = webResults[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.pushSubscription.delete({ where: { endpoint: webSubs[i].endpoint } }).catch(() => {});
      }
    }
  }

  // ─── Native push (FCM/APNs) ──────────────────────────────────────────────
  // Krever Firebase Admin SDK + service-account JSON i FIREBASE_SERVICE_ACCOUNT.
  // Foreløpig en stub — logger device-tokens. Implementer når Firebase-prosjektet
  // er satt opp og iOS/Android-appene er publisert.
  if (nativeSubs.length > 0 && process.env.FIREBASE_SERVICE_ACCOUNT) {
    // TODO: import firebase-admin og send via messaging().sendEachForMulticast()
    // const tokens = nativeSubs.map((s) => s.endpoint);
    // await messaging.sendEachForMulticast({ tokens, notification: {...}, data: { url } });
    console.warn(`[push] ${nativeSubs.length} native devices skipped — FCM ikke aktivert ennå`);
  }
}
