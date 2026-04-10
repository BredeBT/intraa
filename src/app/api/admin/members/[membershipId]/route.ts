import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { membershipId } = await params;

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
    return NextResponse.json({ error: "Kan ikke fjerne eier" }, { status: 400 });

  await db.membership.delete({ where: { id: membershipId } });
  return NextResponse.json({ ok: true });
}
