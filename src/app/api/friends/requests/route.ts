import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// GET /api/friends/requests — pending incoming friend requests
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await db.friendship.findMany({
    where: { receiverId: session.user.id, status: "PENDING" },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
