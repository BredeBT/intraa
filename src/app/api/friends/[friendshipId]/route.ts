import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// DELETE /api/friends/[friendshipId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendshipId } = await params;
  const friendship = await db.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const isMine = friendship.senderId === session.user.id || friendship.receiverId === session.user.id;
  if (!isMine) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  await db.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ ok: true });
}
