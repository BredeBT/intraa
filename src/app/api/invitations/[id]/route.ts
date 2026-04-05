import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const { id } = await params;

  await db.invitation.updateMany({
    where: { id, status: "PENDING" },
    data:  { status: "EXPIRED" },
  });

  return NextResponse.json({ success: true });
}
