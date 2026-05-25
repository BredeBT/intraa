import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { notifyFriendRequest } from "@/server/notifications/dispatch";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/friends/request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Anti-harassment: maks 20 venneforespørsler per time per bruker
  const limited = await rateLimit(req, { key: `friend-req:${session.user.id}`, max: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { receiverId } = await req.json() as { receiverId?: string };
  if (!receiverId) return NextResponse.json({ error: "receiverId required" }, { status: 400 });
  if (receiverId === session.user.id) return NextResponse.json({ error: "Kan ikke legge til deg selv" }, { status: 400 });

  // Check receiver exists
  const receiver = await db.user.findUnique({ where: { id: receiverId }, select: { id: true, name: true } });
  if (!receiver) return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });

  // Check no existing friendship in either direction
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { senderId: session.user.id, receiverId },
        { senderId: receiverId, receiverId: session.user.id },
      ],
    },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") return NextResponse.json({ error: "Allerede venner" }, { status: 409 });
    if (existing.status === "PENDING")  return NextResponse.json({ error: "Forespørsel allerede sendt" }, { status: 409 });
  }

  const friendship = await db.friendship.create({
    data: { senderId: session.user.id, receiverId },
  });

  // Sender info for notification
  const sender = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true, avatarUrl: true },
  });

  void notifyFriendRequest({
    receiverId,
    senderId:     session.user.id,
    senderName:   sender?.name ?? session.user.name ?? "Noen",
    senderAvatar: sender?.avatarUrl,
  }).catch(() => null);

  return NextResponse.json({ friendship }, { status: 201 });
}
