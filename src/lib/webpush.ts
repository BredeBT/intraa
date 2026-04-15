import webpush from "web-push";
import { db } from "@/server/db";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string },
) {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: payload.title,
          body:  payload.body,
          url:   payload.url  ?? "/",
          icon:  payload.icon ?? "/icon-192x192.png",
        }),
      ),
    ),
  );

  // Remove expired/invalid subscriptions (410 Gone, 404 Not Found)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.pushSubscription.delete({ where: { endpoint: subs[i].endpoint } }).catch(() => {});
      }
    }
  }
}
