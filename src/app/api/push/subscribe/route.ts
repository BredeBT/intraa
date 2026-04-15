import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
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
