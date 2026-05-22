import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { notifyFriendAccepted } from "@/server/notifications/dispatch";

// POST /api/friends/respond
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendshipId, action } = await req.json() as { friendshipId?: string; action?: "accept" | "decline" };
  if (!friendshipId || !action) return NextResponse.json({ error: "friendshipId og action required" }, { status: 400 });

  const friendship = await db.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (friendship.receiverId !== session.user.id) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  if (friendship.status !== "PENDING") return NextResponse.json({ error: "Allerede behandlet" }, { status: 409 });

  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated   = await db.friendship.update({ where: { id: friendshipId }, data: { status: newStatus } });

  if (action === "accept") {
    const accepter = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { name: true, avatarUrl: true },
    });
    void notifyFriendAccepted({
      receiverId:    friendship.senderId,
      accepterId:    session.user.id,
      accepterName:  accepter?.name ?? session.user.name ?? "Noen",
      accepterAvatar: accepter?.avatarUrl,
    }).catch(() => null);
  }

  // Auto-dismiss: remove the FRIEND_REQUEST notification on the responder's bell
  void db.notification.deleteMany({
    where: {
      userId: session.user.id,
      type:   "FRIEND_REQUEST",
      metadata: { path: ["fromUserId"], equals: friendship.senderId },
    },
  }).catch(() => null);

  return NextResponse.json({ friendship: updated });
}
