import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { token } = await params;

  const invitation = await db.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitasjonen er ugyldig eller utløpt" }, { status: 400 });
  }

  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Invitasjonen tilhører en annen e-post" }, { status: 403 });
  }

  // Check not already member (race condition guard)
  const alreadyMember = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: invitation.organizationId } },
  });
  if (alreadyMember) {
    await db.invitation.update({ where: { token }, data: { status: "ACCEPTED", usedAt: new Date() } });
    const org = await db.organization.findUnique({ where: { id: invitation.organizationId }, select: { slug: true } });
    return NextResponse.json({ slug: org?.slug ?? "" });
  }

  await db.$transaction([
    db.membership.create({
      data: { userId: session.user.id, organizationId: invitation.organizationId, role: "MEMBER" },
    }),
    db.invitation.update({
      where: { token },
      data:  { status: "ACCEPTED", usedAt: new Date() },
    }),
  ]);

  const org = await db.organization.findUnique({
    where:  { id: invitation.organizationId },
    select: { slug: true },
  });

  return NextResponse.json({ slug: org?.slug ?? "" });
}
