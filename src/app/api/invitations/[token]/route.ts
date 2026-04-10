import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/** DELETE — superadmin or org OWNER/ADMIN expires a pending invitation by token */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { token } = await params;

  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Allow superadmin or org OWNER/ADMIN
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!user?.isSuperAdmin) {
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: invitation.organizationId } },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
  }

  await db.invitation.update({
    where: { token },
    data:  { status: "EXPIRED" },
  });

  return NextResponse.json({ success: true });
}
