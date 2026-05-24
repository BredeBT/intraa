import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/fanpass-portfolio
 * Returnerer alle community-medlemskap brukeren har + Fanpass-status for hvert.
 * Brukt av Fanpass-tab i /innstillinger.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }
  const userId = session.user.id;
  const now    = new Date();

  const memberships = await db.membership.findMany({
    where: { userId, organization: { type: "COMMUNITY" } },
    select: {
      organization: {
        select: {
          id: true, slug: true, name: true, requiresFanpassToJoin: true,
          theme: { select: { logoUrl: true } },
        },
      },
    },
  });

  const orgIds = memberships.map((m) => m.organization.id);
  const fanpasses = await db.fanPass.findMany({
    where:  { userId, organizationId: { in: orgIds } },
    select: { organizationId: true, status: true, endDate: true, cancelledAt: true, paidAmount: true },
  });
  const fpMap = new Map(fanpasses.map((f) => [f.organizationId, f]));

  const communities = memberships.map((m) => {
    const fp     = fpMap.get(m.organization.id);
    const active = !!fp && fp.status === "ACTIVE" && fp.endDate > now;
    return {
      orgId:                 m.organization.id,
      orgSlug:               m.organization.slug,
      orgName:               m.organization.name,
      logoUrl:               m.organization.theme?.logoUrl ?? null,
      requiresFanpassToJoin: m.organization.requiresFanpassToJoin,
      hasFanpass:            active,
      endDate:     fp?.endDate.toISOString() ?? null,
      cancelled:   !!fp?.cancelledAt,
      paidAmount:  fp?.paidAmount ?? 49,
    };
  });

  return NextResponse.json({ communities }, { headers: { "Cache-Control": "private, max-age=30" } });
}
