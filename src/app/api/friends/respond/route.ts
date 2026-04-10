import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

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
    // Notify sender
    const sharedMembership = await db.membership.findFirst({
      where: { userId: friendship.senderId },
      select: { organizationId: true },
    });
    if (sharedMembership) {
      await db.notification.create({
        data: {
          type:           "USER",
          title:          "Venneforespørsel godtatt!",
          body:           `${session.user.name ?? "Noen"} godtok venneforespørselen din`,
          href:           `/home`,
          userId:         friendship.senderId,
          organizationId: sharedMembership.organizationId,
        },
      }).catch(() => null);
    }
  }

  return NextResponse.json({ friendship: updated });
}
