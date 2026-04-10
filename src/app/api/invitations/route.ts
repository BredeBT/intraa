import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { email, organizationId } = (await request.json()) as {
    email: string;
    organizationId: string;
  };

  if (!email || !organizationId) {
    return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
  }

  // Verify caller is OWNER or ADMIN
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  // Check if user is already a member
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    const alreadyMember = await db.membership.findUnique({
      where: { userId_organizationId: { userId: existing.id, organizationId } },
    });
    if (alreadyMember) {
      return NextResponse.json({ error: "Brukeren er allerede medlem" }, { status: 400 });
    }
  }

  // Check for existing pending invitation
  const existingInvite = await db.invitation.findFirst({
    where: { email: email.toLowerCase(), organizationId, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "Det finnes allerede en aktiv invitasjon for denne e-posten" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await db.invitation.create({
    data: {
      email:         email.toLowerCase(),
      organizationId,
      invitedById:   session.user.id,
      expiresAt,
      status:        "PENDING",
    },
  });

  return NextResponse.json({ token: invitation.token });
}
