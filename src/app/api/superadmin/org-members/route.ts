import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const body = await request.json() as {
    action:       "add" | "remove" | "changeRole";
    orgId:        string;
    membershipId?: string;
    userId?:      string;
    role?:        MemberRole;
  };

  const { action, orgId } = body;

  if (action === "add") {
    const { userId, role = "MEMBER" } = body;
    if (!userId) return NextResponse.json({ error: "userId mangler" }, { status: 400 });

    const existing = await db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (existing) return NextResponse.json({ error: "Bruker er allerede medlem" }, { status: 409 });

    const membership = await db.membership.create({
      data: { userId, organizationId: orgId, role },
    });
    return NextResponse.json({ membership });
  }

  if (action === "changeRole") {
    const { membershipId, role } = body;
    if (!membershipId || !role) return NextResponse.json({ error: "Mangler felt" }, { status: 400 });

    await db.membership.update({ where: { id: membershipId }, data: { role } });
    return NextResponse.json({ success: true });
  }

  if (action === "remove") {
    const { membershipId } = body;
    if (!membershipId) return NextResponse.json({ error: "Mangler membershipId" }, { status: 400 });

    const m = await db.membership.findUnique({ where: { id: membershipId } });
    if (m?.role === "OWNER") return NextResponse.json({ error: "Kan ikke fjerne eier" }, { status: 400 });

    await db.membership.delete({ where: { id: membershipId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ukjent handling" }, { status: 400 });
}
