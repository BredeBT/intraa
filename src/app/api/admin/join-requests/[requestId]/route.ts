import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

/**
 * PATCH /api/admin/join-requests/[requestId] { action: "approve" | "reject" }
 * Godkjenn → opprett Membership og marker forespørsel APPROVED.
 * Avslå     → marker REJECTED uten å opprette medlemskap.
 * Begge varsler brukeren via Notification.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session            = await auth();
  const { organizationId } = await requireAdmin();
  const { requestId }      = await params;

  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { action } = (await req.json()) as { action?: "approve" | "reject" };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ugyldig action" }, { status: 400 });
  }

  const request = await db.joinRequest.findUnique({
    where:   { id: requestId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  if (!request) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (request.organizationId !== organizationId) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Allerede behandlet" }, { status: 400 });
  }

  if (action === "approve") {
    // Opprett membership (idempotent — skip om allerede medlem) og marker request
    await db.$transaction([
      db.membership.upsert({
        where:  { userId_organizationId: { userId: request.userId, organizationId } },
        create: { userId: request.userId, organizationId, role: "MEMBER" },
        update: {},
      }),
      db.joinRequest.update({
        where: { id: requestId },
        data:  { status: "APPROVED", reviewedAt: new Date(), reviewedById: session.user.id },
      }),
      db.notification.create({
        data: {
          userId:         request.userId,
          organizationId,
          type:           "MENTION",
          title:          "Forespørsel godkjent",
          body:           `Du er nå medlem av ${request.organization.name}`,
          href:           `/${request.organization.slug}/feed`,
          priority:       0,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  // Reject
  await db.$transaction([
    db.joinRequest.update({
      where: { id: requestId },
      data:  { status: "REJECTED", reviewedAt: new Date(), reviewedById: session.user.id },
    }),
    db.notification.create({
      data: {
        userId:         request.userId,
        organizationId,
        type:           "MENTION",
        title:          "Forespørsel avslått",
        body:           `Forespørselen din til ${request.organization.name} ble ikke godkjent denne gangen`,
        href:           `/utforsk`,
        priority:       0,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
