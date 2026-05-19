import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const caller = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  return caller?.isSuperAdmin ? session.user.id : null;
}

/**
 * GET — list all communities the user is member of, with current Fanpass status
 *   { communities: [{ orgId, orgSlug, orgName, hasFanpass, fanpassEnd, fanpassGranted }] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const callerId = await requireSuperAdmin();
  if (!callerId) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;

  const memberships = await db.membership.findMany({
    where: { userId },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  });

  const fanpasses = await db.fanPass.findMany({
    where: { userId },
    select: { organizationId: true, status: true, endDate: true, paidAmount: true },
  });
  const fpMap = new Map(fanpasses.map((f) => [f.organizationId, f]));

  const now = new Date();
  const communities = memberships.map((m) => {
    const fp = fpMap.get(m.organization.id);
    const active = !!fp && fp.status === "ACTIVE" && fp.endDate > now;
    return {
      orgId:       m.organization.id,
      orgSlug:     m.organization.slug,
      orgName:     m.organization.name,
      hasFanpass:  active,
      fanpassEnd:  fp?.endDate.toISOString() ?? null,
      // paidAmount = 0 means "granted by admin without payment"
      granted:     active && fp!.paidAmount === 0,
    };
  });

  return NextResponse.json({ communities });
}

/**
 * POST — grant Fanpass for a specific org (free of charge, 30 days from now)
 *   body: { orgId, durationDays? = 30 }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const callerId = await requireSuperAdmin();
  if (!callerId) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;
  const { orgId, durationDays = 30 } = await req.json() as { orgId?: string; durationDays?: number };
  if (!orgId) return NextResponse.json({ error: "orgId mangler" }, { status: 400 });

  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Org ikke funnet" }, { status: 404 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });

  // Ensure the user is a member of the org (auto-add as MEMBER if not — useful for EXCLUSIVE orgs)
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { id: true },
  });
  if (!membership) {
    await db.membership.create({
      data: { userId, organizationId: orgId, role: "MEMBER" },
    });
  }

  const endDate = new Date(Date.now() + Math.max(1, durationDays) * 24 * 60 * 60 * 1000);

  const fanpass = await db.fanPass.upsert({
    where:  { userId_organizationId: { userId, organizationId: orgId } },
    create: {
      userId,
      organizationId: orgId,
      status:         "ACTIVE",
      startDate:      new Date(),
      endDate,
      paidAmount:     0, // 0 = granted by admin
      cancelledAt:    null,
    },
    update: {
      status:      "ACTIVE",
      endDate,
      paidAmount:  0,
      cancelledAt: null,
    },
  });

  revalidatePath("/meldinger");
  revalidatePath("/feed");
  revalidatePath("/home");
  return NextResponse.json({ ok: true, fanpass });
}

/**
 * DELETE — revoke Fanpass for a specific org
 *   query: ?orgId=…
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const callerId = await requireSuperAdmin();
  if (!callerId) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;
  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId mangler" }, { status: 400 });

  // Soft-cancel — set status and cancelledAt rather than delete the row
  // so the audit trail remains
  await db.fanPass.updateMany({
    where: { userId, organizationId: orgId, status: "ACTIVE" },
    data:  {
      status:      "CANCELLED",
      cancelledAt: new Date(),
      endDate:     new Date(), // expire now
    },
  });

  revalidatePath("/meldinger");
  revalidatePath("/feed");
  revalidatePath("/home");
  return NextResponse.json({ ok: true });
}
