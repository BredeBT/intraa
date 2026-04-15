import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { sendPushToUser } from "@/lib/webpush";

/** POST /api/push/call — notify a user of an incoming call via push */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { calleeId?: string; type?: "audio" | "video" };
  const { calleeId, type = "audio" } = body;
  if (!calleeId) return NextResponse.json({ error: "calleeId required" }, { status: 400 });

  // Verify friendship
  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: session.user.id, receiverId: calleeId },
        { senderId: calleeId,        receiverId: session.user.id },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const caller = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true },
  });

  await sendPushToUser(calleeId, {
    title: type === "video" ? "📹 Innkommende videoanrop" : "📞 Innkommende anrop",
    body:  `${caller?.name ?? "Noen"} ringer deg`,
    url:   "/meldinger",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
