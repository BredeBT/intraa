import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";
import { COMPANY_FEATURES, COMMUNITY_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

function toInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const ACCENT_COLORS = ["#6366f1", "#f97316", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

function orgColor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

/**
 * GET /api/layout/init
 * Bundlet init for app-layouten — én roundtrip istedenfor 4-5 separate fetches
 * (/api/user/org + /api/user/orgs + /api/layout/bootstrap + /api/user/unread).
 * Stream-status og unread polles fortsatt på sine egne endpoints etter init.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }
  const userId = session.user.id;

  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_org")?.value;

  // Hent alle memberships + valgt org sin features/theme i parallell.
  const allMemberships = await db.membership.findMany({
    where:   { userId },
    include: { organization: true },
    orderBy: { organization: { createdAt: "asc" } },
  });

  let activeMembership = selectedSlug
    ? allMemberships.find((m) => m.organization.slug === selectedSlug) ?? null
    : null;
  if (!activeMembership) activeMembership = allMemberships[0] ?? null;

  if (!activeMembership) {
    // Bruker uten org — returner tom skall, layout håndterer no-org-state.
    return NextResponse.json({
      org:       null,
      allOrgs:   [],
      features:  [],
      theme:     null,
      unread:    0,
    });
  }

  const activeOrgId = activeMembership.organizationId;

  // Features + theme + unread i parallell for valgt org.
  const [featureRows, theme, unreadDms] = await Promise.all([
    db.organizationFeature.findMany({ where: { organizationId: activeOrgId } }),
    db.tenantTheme.findUnique({ where: { organizationId: activeOrgId } }),
    db.directMessage.count({
      where: { receiverId: userId, readAt: null },
    }),
  ]);

  // Auto-seed features hvis tom (samme logikk som bootstrap-endpoint).
  let finalFeatureRows = featureRows;
  if (featureRows.length === 0) {
    await seedDefaultFeatures(activeOrgId, activeMembership.organization.type);
    finalFeatureRows = await db.organizationFeature.findMany({ where: { organizationId: activeOrgId } });
  } else {
    const expectedFeatures = activeMembership.organization.type === "COMPANY"
      ? COMPANY_FEATURES
      : COMMUNITY_FEATURES;
    const existingKeys = new Set(featureRows.map((f) => f.feature));
    const missing      = expectedFeatures.filter((f) => !existingKeys.has(f));
    if (missing.length > 0) {
      await seedDefaultFeatures(activeOrgId, activeMembership.organization.type);
      finalFeatureRows = await db.organizationFeature.findMany({ where: { organizationId: activeOrgId } });
    }
  }

  const features = finalFeatureRows.filter((f) => f.enabled).map((f) => f.feature);

  const orgToJson = (m: typeof activeMembership) => ({
    id:          m!.organization.id,
    slug:        m!.organization.slug,
    name:        m!.organization.name,
    initials:    toInitials(m!.organization.name),
    type:        m!.organization.type,
    plan:        m!.organization.plan,
    accentColor: orgColor(m!.organization.id),
    userRole:    m!.role,
  });

  return NextResponse.json({
    org:      orgToJson(activeMembership),
    allOrgs:  allMemberships.map((m) => orgToJson(m)),
    features,
    theme,
    unread:   unreadDms,
  });
}
