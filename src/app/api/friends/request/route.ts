import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/friends/request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Notify receiver — find any shared org or use a global notification
  const sharedMembership = await db.membership.findFirst({
    where: { userId: receiverId },
    select: { organizationId: true },
  });

  if (sharedMembership) {
    await db.notification.create({
      data: {
        type:           "USER",
        title:          "Ny venneforespørsel",
        body:           `${session.user.name ?? "Noen"} vil bli venn med deg`,
        href:           `/home`,
        userId:         receiverId,
        organizationId: sharedMembership.organizationId,
      },
    }).catch(() => null);
  }

  return NextResponse.json({ friendship }, { status: 201 });
}
