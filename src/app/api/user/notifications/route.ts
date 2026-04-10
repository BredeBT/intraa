import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/** GET /api/user/notifications — fetch notification preferences */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const prefs = await db.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  // Return defaults if not yet set
  return NextResponse.json({
    emailOnMessage: prefs?.emailOnMessage ?? true,
    emailOnTicket:  prefs?.emailOnTicket  ?? true,
    emailOnComment: prefs?.emailOnComment ?? true,
    emailOnMention: prefs?.emailOnMention ?? true,
    emailOnFile:    prefs?.emailOnFile    ?? false,
    pushOnMessage:  prefs?.pushOnMessage  ?? true,
    pushOnTicket:   prefs?.pushOnTicket   ?? false,
    pushOnComment:  prefs?.pushOnComment  ?? false,
    pushOnMention:  prefs?.pushOnMention  ?? true,
    pushOnFile:     prefs?.pushOnFile     ?? false,
  });
}

/** PATCH /api/user/notifications — upsert notification preferences */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = (await request.json()) as {
    emailOnMessage?: boolean;
    emailOnTicket?:  boolean;
    emailOnComment?: boolean;
    emailOnMention?: boolean;
    emailOnFile?:    boolean;
    pushOnMessage?:  boolean;
    pushOnTicket?:   boolean;
    pushOnComment?:  boolean;
    pushOnMention?:  boolean;
    pushOnFile?:     boolean;
  };

  const prefs = await db.notificationPreference.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, ...body },
    update: body,
  });

  return NextResponse.json({ success: true, prefs });
}
