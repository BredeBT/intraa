import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db }   from "@/server/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/** POST — generate (or return existing) open invite token for a private org */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { orgId } = await params;
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true, openInviteToken: true } });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Reuse existing token if already generated
  if (org.openInviteToken) {
    return NextResponse.json({ token: org.openInviteToken });
  }

  const token = randomBytes(24).toString("hex");
  await db.organization.update({ where: { id: orgId }, data: { openInviteToken: token } });

  return NextResponse.json({ token });
}

/** DELETE — revoke open invite token */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { orgId } = await params;
  await db.organization.update({ where: { id: orgId }, data: { openInviteToken: null } });
  return NextResponse.json({ ok: true });
}
