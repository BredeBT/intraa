import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/my-fanpass — returns the current user's Fanpass status
 * across all orgs they're a member of. Used to debug unlock issues.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const [user, memberships, fanpasses] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, name: true },
    }),
    db.membership.findMany({
      where: { userId },
      include: { organization: { select: { id: true, slug: true, name: true, accessMode: true } } },
    }),
    db.fanPass.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const fpByOrg = new Map(fanpasses.map((f) => [f.organizationId, f]));

  return NextResponse.json({
    user,
    now: now.toISOString(),
    memberships: memberships.map((m) => {
      const fp = fpByOrg.get(m.organization.id);
      return {
        orgId:      m.organization.id,
        orgSlug:    m.organization.slug,
        orgName:    m.organization.name,
        accessMode: m.organization.accessMode,
        role:       m.role,
        fanpass: fp ? {
          status:        fp.status,
          startDate:     fp.startDate.toISOString(),
          endDate:       fp.endDate.toISOString(),
          paidAmount:    fp.paidAmount,
          cancelledAt:   fp.cancelledAt?.toISOString() ?? null,
          isActive:      fp.status === "ACTIVE" && fp.endDate > now,
          // What the query would see
          matchesQuery:  fp.status === "ACTIVE" && fp.endDate > now,
        } : null,
      };
    }),
    fanpassRowsTotal: fanpasses.length,
  });
}
