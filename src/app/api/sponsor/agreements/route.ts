import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { bumpExpiredAgreements } from "@/lib/sponsorAgreements";

export const dynamic = "force-dynamic";

/**
 * GET /api/sponsor/agreements — list agreements involving current user.
 * Auto-detekterer rolle: hvis bruker har SponsorProfile listes avtaler
 * de eier (som sponsor); creators får avtaler hvor de er creator-parten.
 * En bruker som er BÅDE creator og sponsor får begge lister (sponsorRows
 * + creatorRows).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  await bumpExpiredAgreements();

  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true },
  });

  const [sponsorRows, creatorRows] = await Promise.all([
    sponsor
      ? db.sponsorAgreement.findMany({
          where:    { sponsorId: sponsor.id },
          orderBy:  { updatedAt: "desc" },
          include:  {
            creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        })
      : Promise.resolve([]),
    db.sponsorAgreement.findMany({
      where:    { creatorId: session.user.id },
      orderBy:  { updatedAt: "desc" },
      include:  {
        sponsor: { select: { id: true, brandName: true, slug: true, logoUrl: true } },
      },
    }),
  ]);

  return NextResponse.json({
    asSponsor: sponsorRows,
    asCreator: creatorRows,
  });
}

interface CreateBody {
  creatorId:      string;
  brandName:      string;
  brandOrgNumber?: string;
  contactEmail:   string;
  contactPhone?:  string;
  workDescription: string;
  periodStart:    string;
  periodEnd:      string;
  compensation?:  string;
  /** Hvis true: signer som sponsor samtidig som vi oppretter — sender
   *  til creator. Hvis false: lagre som DRAFT. */
  send?:          boolean;
}

/**
 * POST /api/sponsor/agreements — sponsor oppretter en ny avtale.
 * Body inneholder mal-felter. Hvis `send=true` blir den umiddelbart
 * sponsor-signert og status PENDING_CREATOR. Ellers DRAFT.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, brandName: true },
  });
  if (!sponsor) return NextResponse.json({ error: "Du har ikke en sponsor-profil" }, { status: 403 });

  let body: CreateBody;
  try {
    body = await req.json() as CreateBody;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  if (!body.creatorId || !body.brandName?.trim() || !body.contactEmail?.trim()
   || !body.workDescription?.trim() || !body.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: "Mangler påkrevde felter" }, { status: 400 });
  }

  const periodStart = new Date(body.periodStart);
  const periodEnd   = new Date(body.periodEnd);
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime()) || periodEnd <= periodStart) {
    return NextResponse.json({ error: "Ugyldig periode" }, { status: 400 });
  }

  // Verifiser at creator finnes + har CREATOR-userType
  const creator = await db.user.findUnique({
    where:  { id: body.creatorId },
    select: { id: true, userType: true },
  });
  if (!creator || creator.userType !== "CREATOR") {
    return NextResponse.json({ error: "Ugyldig creator" }, { status: 400 });
  }

  const send = !!body.send;
  const now  = new Date();

  const created = await db.sponsorAgreement.create({
    data: {
      sponsorId:       sponsor.id,
      creatorId:       body.creatorId,
      brandName:       body.brandName.trim(),
      brandOrgNumber:  body.brandOrgNumber?.trim() || null,
      contactEmail:    body.contactEmail.trim(),
      contactPhone:    body.contactPhone?.trim() || null,
      workDescription: body.workDescription.trim().slice(0, 4000),
      periodStart,
      periodEnd,
      compensation:    body.compensation?.trim() || null,
      status:          send ? "PENDING_CREATOR" : "DRAFT",
      sponsorSignedAt: send ? now : null,
    },
    include: { creator: { select: { id: true, name: true, username: true } } },
  });

  if (send) {
    await db.notification.create({
      data: {
        userId:   body.creatorId,
        type:     "SPONSOR_TAG", // gjenbruker eksisterende type — phase B kan introdusere SPONSOR_AGREEMENT
        title:    `Ny sponsoravtale fra ${sponsor.brandName}`,
        body:     "Du har mottatt en ny sponsoravtale. Les gjennom og signer i sponsor-henvendelser.",
        href:     "/sponsor-henvendelser",
        priority: 2,
      },
    });
  }

  return NextResponse.json({ agreement: created });
}
