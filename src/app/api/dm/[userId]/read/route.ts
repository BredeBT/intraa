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

  // Auto-dismiss: clear MESSAGE notifications from this sender
  await db.notification.deleteMany({
    where: {
      userId: session.user.id,
      type:   "MESSAGE",
      metadata: { path: ["fromUserId"], equals: userId },
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
