import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// GET /api/friends — all ACCEPTED friendships for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friendships = await db.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId:   session.user.id },
        { receiverId: session.user.id },
      ],
    },
    include: {
      sender:   { select: { id: true, name: true, avatarUrl: true, status: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friends = friendships.map((f) => ({
    friendshipId: f.id,
    friend: f.senderId === session.user.id ? f.receiver : f.sender,
  }));

  return NextResponse.json({ friends });
}
