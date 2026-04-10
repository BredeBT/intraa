import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// PATCH /api/dm/[userId]/read — mark messages as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  await db.directMessage.updateMany({
    where: { senderId: userId, receiverId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
