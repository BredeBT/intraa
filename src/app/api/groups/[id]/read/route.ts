import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// PATCH /api/groups/[id]/read — mark group as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  await db.groupChatMember.updateMany({
    where: { groupId, userId: session.user.id },
    data:  { lastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
