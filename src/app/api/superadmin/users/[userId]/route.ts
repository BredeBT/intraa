import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { validateUsername } from "@/lib/bannedUsernames";

async function getSuperAdmin(req: NextRequest) {
  void req;
  const session = await auth();
  if (!session?.user?.id) return null;
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  return caller?.isSuperAdmin ? session.user.id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const callerId = await getSuperAdmin(req);
  if (!callerId) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json() as { name?: string; username?: string; email?: string };
  const { name, username, email } = body;

  if (username !== undefined) {
    const validation = validateUsername(username);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

    const existing = await db.user.findFirst({ where: { username, id: { not: userId } }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Brukernavnet er allerede tatt" }, { status: 409 });
  }

  if (email !== undefined) {
    const existing = await db.user.findFirst({ where: { email, id: { not: userId } }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "E-posten er allerede i bruk" }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (name     !== undefined) data.name     = name;
  if (username !== undefined) data.username = username;
  if (email    !== undefined) data.email    = email;

  const updated = await db.user.update({
    where:  { id: userId },
    data,
    select: { id: true, name: true, username: true, email: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const callerId = await getSuperAdmin(req);
  if (!callerId) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;
  if (userId === callerId) return NextResponse.json({ error: "Kan ikke slette din egen konto" }, { status: 400 });

  // Remove from all communities (memberships) instead of hard delete
  await db.membership.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
