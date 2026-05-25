import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { audit, AuditActions } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { membershipId } = await params;
  const { ban }: { ban: boolean } = await req.json();

  // Find the membership and verify caller is OWNER/ADMIN of same org
  const target = await db.membership.findUnique({
    where: { id: membershipId },
    select: { organizationId: true, role: true, userId: true },
  });
  if (!target) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const caller = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: target.organizationId } },
    select: { role: true },
  });
  if (!caller || !["OWNER", "ADMIN"].includes(caller.role))
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  if (target.role === "OWNER")
    return NextResponse.json({ error: "Kan ikke blokkere eier" }, { status: 400 });

  const updated = await db.membership.update({
    where: { id: membershipId },
    data: {
      isBanned: ban,
      bannedAt: ban ? new Date() : null,
      bannedBy: ban ? session.user.id : null,
    },
  });

  void audit({
    actorId:        session.user.id,
    organizationId: target.organizationId,
    action:         ban ? AuditActions.MEMBER_BAN : AuditActions.MEMBER_UNBAN,
    targetType:     "user",
    targetId:       target.userId,
    metadata:       { membershipId },
  });

  return NextResponse.json({ membership: updated });
}
