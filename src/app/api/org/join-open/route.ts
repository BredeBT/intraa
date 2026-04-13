import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db }   from "@/server/db";

/** POST /api/org/join-open — join a private org via openInviteToken */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { token } = await req.json() as { token?: string };
  if (!token) return NextResponse.json({ error: "Token mangler" }, { status: 400 });

  const org = await db.organization.findUnique({
    where:  { openInviteToken: token },
    select: { id: true, slug: true, name: true, visibility: true },
  });
  if (!org) return NextResponse.json({ error: "Ugyldig eller utløpt invitasjonslenke" }, { status: 404 });

  // Already member?
  const existing = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
  });
  if (existing) return NextResponse.json({ ok: true, slug: org.slug, alreadyMember: true });

  await db.membership.create({
    data: { userId: session.user.id, organizationId: org.id, role: "MEMBER" },
  });

  return NextResponse.json({ ok: true, slug: org.slug });
}
