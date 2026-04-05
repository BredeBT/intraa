import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { signIn } from "@/auth";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    token?:    string;
    name?:     string;
    password?: string;
  };

  const { token, name, password } = body;

  if (!token || !name?.trim() || !password) {
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Passordet må være minst 8 tegn" }, { status: 400 });
  }

  // Look up invitation
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitasjonen er ugyldig eller utløpt" }, { status: 400 });
  }

  if (invitation.expiresAt < new Date()) {
    await db.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitasjonen har utløpt" }, { status: 400 });
  }

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email: invitation.email } });
  if (existing) {
    return NextResponse.json({ error: "En bruker med denne e-posten finnes allerede" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user + membership atomically
  const memberRole = invitation.role === "ADMIN" ? "ADMIN" : "MEMBER";

  const user = await db.user.create({
    data: {
      email:    invitation.email,
      name:     name.trim(),
      password: passwordHash,
      memberships: {
        create: {
          organizationId: invitation.organizationId,
          role:           memberRole,
        },
      },
    },
  });

  // Mark invitation as used
  await db.invitation.update({
    where: { token },
    data:  { status: "ACCEPTED", usedAt: new Date() },
  });

  // Sign in the new user
  try {
    await signIn("credentials", {
      email:    user.email,
      password,
      redirect: false,
    });
  } catch {
    // signIn may throw on redirect — ignore
  }

  return NextResponse.json({ success: true });
}
