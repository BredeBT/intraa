import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// DELETE /api/groups/[id] — only creator can delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;

  const group = await db.groupChat.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (group.createdBy !== session.user.id)
    return NextResponse.json({ error: "Kun oppretter kan slette gruppen" }, { status: 403 });

  await db.groupChat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
