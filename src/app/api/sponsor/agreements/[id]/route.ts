import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { bumpExpiredAgreements } from "@/lib/sponsorAgreements";

export const dynamic = "force-dynamic";

/**
 * Henter en avtale og fastslår om brukeren er sponsor- eller creator-
 * parten. Returnerer 404 hvis brukeren ikke har noe med avtalen å gjøre.
 */
type AgreementRole = "SPONSOR" | "CREATOR" | null;

async function getAgreementContext(userId: string, id: string) {
  const agreement = await db.sponsorAgreement.findUnique({
    where: { id },
    include: {
      sponsor: { select: { id: true, userId: true, brandName: true, slug: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
  });
  const noResult = { agreement: null, role: null as AgreementRole };
  if (!agreement) return noResult;

  if (agreement.sponsor.userId === userId) return { agreement, role: "SPONSOR" as AgreementRole };
  if (agreement.creatorId === userId)      return { agreement, role: "CREATOR" as AgreementRole };
  return noResult;
}

/** GET — full detail med begge parter inkludert. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  await bumpExpiredAgreements();

  const { id } = await params;
  const { agreement, role } = await getAgreementContext(session.user.id, id);
  if (!agreement) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  return NextResponse.json({ agreement, role });
}

/**
 * PATCH — actions: "send" (sponsor → PENDING_CREATOR), "sign" (creator →
 * ACTIVE), "revoke" (begge → REVOKED).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;
  const { agreement, role } = await getAgreementContext(session.user.id, id);
  if (!agreement) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  let body: { action?: string; reason?: string };
  try {
    body = await req.json() as { action?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const now = new Date();

  switch (body.action) {
    case "send": {
      if (role !== "SPONSOR") return NextResponse.json({ error: "Kun sponsor kan sende" }, { status: 403 });
      if (agreement.status !== "DRAFT") return NextResponse.json({ error: "Avtalen kan ikke sendes i denne tilstanden" }, { status: 400 });

      const updated = await db.sponsorAgreement.update({
        where: { id },
        data:  { status: "PENDING_CREATOR", sponsorSignedAt: now },
      });
      await db.notification.create({
        data: {
          userId:   agreement.creatorId,
          type:     "SPONSOR_TAG",
          title:    `Ny sponsoravtale fra ${agreement.sponsor.brandName}`,
          body:     "Du har mottatt en ny sponsoravtale. Les gjennom og signer i sponsor-henvendelser.",
          href:     "/sponsor-henvendelser",
          priority: 2,
        },
      });
      return NextResponse.json({ agreement: updated });
    }

    case "sign": {
      if (role !== "CREATOR") return NextResponse.json({ error: "Kun creator kan signere" }, { status: 403 });
      if (agreement.status !== "PENDING_CREATOR") return NextResponse.json({ error: "Avtalen er ikke klar til signering" }, { status: 400 });

      // Hvis periodEnd allerede har passert er den utløpt før den ble signert
      const newStatus = agreement.periodEnd < now ? "EXPIRED" : "ACTIVE";

      const updated = await db.sponsorAgreement.update({
        where: { id },
        data:  { status: newStatus, creatorSignedAt: now },
      });
      // Varsle sponsoren om at avtalen er aktiv
      await db.notification.create({
        data: {
          userId:   agreement.sponsor.userId,
          type:     "SPONSOR_TAG",
          title:    newStatus === "ACTIVE" ? "Sponsoravtale aktivert" : "Sponsoravtale signert (utløpt)",
          body:     `${agreement.creator.name ?? "Creator"} har signert avtalen.`,
          href:     "/brand/avtaler",
          priority: 1,
        },
      });
      return NextResponse.json({ agreement: updated });
    }

    case "revoke": {
      // Begge parter kan revoke når som helst
      if (agreement.status === "REVOKED" || agreement.status === "EXPIRED") {
        return NextResponse.json({ error: "Avtalen er allerede avsluttet" }, { status: 400 });
      }
      const reason = (body.reason ?? "").trim().slice(0, 500) || null;
      const updated = await db.sponsorAgreement.update({
        where: { id },
        data:  {
          status:        "REVOKED",
          revokedAt:     now,
          revokedBy:     session.user.id,
          revokedReason: reason,
        },
      });
      // Varsle den andre parten
      const otherUserId = role === "SPONSOR" ? agreement.creatorId : agreement.sponsor.userId;
      const revokerLabel = role === "SPONSOR" ? agreement.sponsor.brandName : (agreement.creator.name ?? "Creator");
      await db.notification.create({
        data: {
          userId:   otherUserId,
          type:     "SPONSOR_TAG",
          title:    "Sponsoravtale avsluttet",
          body:     `${revokerLabel} har avsluttet avtalen${reason ? `: ${reason}` : ""}.`,
          href:     role === "SPONSOR" ? "/sponsor-henvendelser" : "/brand/avtaler",
          priority: 1,
        },
      });
      return NextResponse.json({ agreement: updated });
    }

    default:
      return NextResponse.json({ error: "Ukjent action" }, { status: 400 });
  }
}
