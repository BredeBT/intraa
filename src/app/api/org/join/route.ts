import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/org/join — join an open community
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await req.json() as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.type !== "COMMUNITY") return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (org.joinType === "PRIVATE") return NextResponse.json({ error: "Kun via invitasjon" }, { status: 403 });

  // Check already member
  const existing = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyMember: true });

  if (org.joinType === "OPEN") {
    await db.membership.create({
      data: { userId: session.user.id, organizationId: orgId, role: "MEMBER" },
    });
    return NextResponse.json({ ok: true });
  }

  // CLOSED: create invitation request (pending) — for now just return a message
  return NextResponse.json({ ok: true, pending: true, message: "Forespørsel sendt til eier" });
}
