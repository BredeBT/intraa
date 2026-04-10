import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

/** PATCH /api/user/account — change email and/or password */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = (await request.json()) as {
    email?:           string;
    currentPassword?: string;
    newPassword?:     string;
  };

  const { email, currentPassword, newPassword } = body;

  // ── Email change ──────────────────────────────────────────────────────────
  if (email !== undefined) {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: "Ugyldig e-postformat" }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email: trimmed } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "E-postadressen er allerede i bruk" }, { status: 409 });
    }
    await db.user.update({ where: { id: session.user.id }, data: { email: trimmed } });
    return NextResponse.json({ success: true, emailChanged: true });
  }

  // ── Password change ───────────────────────────────────────────────────────
  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Nåværende passord er påkrevd" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Nytt passord må være minst 8 tegn" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    if (!user?.password) {
      return NextResponse.json({ error: "Konto bruker ekstern innlogging — passord kan ikke endres" }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Nåværende passord er feil" }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });
    return NextResponse.json({ success: true, passwordChanged: true });
  }

  return NextResponse.json({ error: "Ingen endringer sendt" }, { status: 400 });
}
