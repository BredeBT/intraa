import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const body = await request.json() as {
    email?: string;
    organizationId?: string;
    role?: "ADMIN" | "MEMBER";
  };

  const { email, organizationId, role = "MEMBER" } = body;

  if (!email || !organizationId) {
    return NextResponse.json({ error: "email og organizationId er påkrevd" }, { status: 400 });
  }

  // Check org exists
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return NextResponse.json({ error: "Organisasjon ikke funnet" }, { status: 404 });
  }

  // Expire any existing pending invitations for same email+org
  await db.invitation.updateMany({
    where: { email, organizationId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await db.invitation.create({
    data: {
      email,
      organizationId,
      role,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  const baseUrl = request.nextUrl.origin;
  const inviteUrl = `${baseUrl}/inviter/${invitation.token}`;

  return NextResponse.json({ success: true, inviteUrl, token: invitation.token });
}
