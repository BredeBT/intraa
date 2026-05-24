import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/org/join { orgId, message? } — bli medlem eller send forespørsel
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { orgId, message } = await req.json() as { orgId?: string; message?: string };
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.type !== "COMMUNITY") return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (org.joinType === "PRIVATE") return NextResponse.json({ error: "Kun via invitasjon" }, { status: 403 });

  // Allerede medlem?
  const existing = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyMember: true });

  // Fanpass-krav?
  if (org.requiresFanpassToJoin) {
    const fanpass = await db.fanPass.findFirst({
      where: {
        userId,
        organizationId: orgId,
        status:         "ACTIVE",
        endDate:        { gt: new Date() },
      },
      select: { id: true },
    });
    if (!fanpass) {
      return NextResponse.json({
        ok:               false,
        fanpassRequired:  true,
        fanpassCheckout:  `/${org.slug}/fanpass`,
        message:          "Dette communityet krever Fanpass for å bli medlem.",
      }, { status: 402 });
    }
  }

  if (org.joinType === "OPEN") {
    await db.membership.create({
      data: { userId, organizationId: orgId, role: "MEMBER" },
    });
    return NextResponse.json({ ok: true, joined: true });
  }

  // CLOSED — opprett (eller gjenbruk) en JoinRequest
  const trimmedMsg = message?.trim().slice(0, 500) ?? null;

  // Sjekk eksisterende forespørsel
  const prior = await db.joinRequest.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });

  if (prior?.status === "PENDING") {
    return NextResponse.json({ ok: true, pending: true, alreadyRequested: true });
  }

  if (prior) {
    // Tidligere avslått/godkjent → re-opprett som PENDING
    await db.joinRequest.update({
      where: { id: prior.id },
      data:  {
        status:       "PENDING",
        message:      trimmedMsg,
        createdAt:    new Date(),
        reviewedAt:   null,
        reviewedById: null,
      },
    });
  } else {
    await db.joinRequest.create({
      data: { userId, organizationId: orgId, message: trimmedMsg, status: "PENDING" },
    });
  }

  // Varsle org-eiere/admin om ny forespørsel
  const admins = await db.membership.findMany({
    where:  { organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });
  const requester = await db.user.findUnique({
    where:  { id: userId },
    select: { name: true, username: true },
  });
  const requesterName = requester?.name ?? requester?.username ?? "Noen";

  if (admins.length > 0) {
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId:         a.userId,
        organizationId: orgId,
        type:           "MENTION",  // gjenbruker eksisterende type; ny type-enum kan komme senere
        title:          "Ny medlemskaps-forespørsel",
        body:           `${requesterName} vil bli medlem av ${org.name}`,
        href:           `/admin/foresporsler`,
        priority:       0,
      })),
    });
  }

  return NextResponse.json({ ok: true, pending: true });
}
