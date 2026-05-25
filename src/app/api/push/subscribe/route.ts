import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/**
 * POST /api/push/subscribe
 * To moduser:
 *  • Web Push (platform = "web"): body har { endpoint, keys: { p256dh, auth } }
 *  • Native (platform = "ios" eller "android"): body har { platform, token }
 *    der `token` er FCM/APNs device-token fra Capacitor Push Notifications.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json() as {
    endpoint?: string;
    keys?:     { p256dh?: string; auth?: string };
    platform?: string;
    token?:    string;
  };

  // Native-modus
  if (body.platform === "ios" || body.platform === "android") {
    if (!body.token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    await db.pushSubscription.upsert({
      where:  { endpoint: body.token },
      update: { userId, platform: body.platform, p256dh: null, auth: null },
      create: { userId, platform: body.platform, endpoint: body.token, p256dh: null, auth: null },
    });
    return NextResponse.json({ ok: true, platform: body.platform });
  }

  // Web Push (default)
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where:  { endpoint },
    update: { userId, platform: "web", p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, platform: "web", endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true, platform: "web" });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { endpoint?: string };
  if (body.endpoint) {
    await db.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: session.user.id },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
