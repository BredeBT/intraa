import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";

const DEFAULT_SETTINGS = {
  showStatus:       true,
  showBio:          true,
  showWebsite:      true,
  showSocials:      true,
  showStats:        true,
  showMemberCount:  true,
  showPostCount:    true,
  showCreatedAt:    true,
  showStreamStatus: true,
  customTitle:      null as string | null,
  customText:       null as string | null,
  showCustomText:   false,
  showTopPoints:    false,
};

/** GET /api/tenant/sidebar-settings?orgId=X */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { db } = await import("@/server/db");
  const settings = await db.profileSidebarSettings.findUnique({
    where: { organizationId: orgId },
  });

  return NextResponse.json(settings ?? { ...DEFAULT_SETTINGS, organizationId: orgId });
}

/** PATCH /api/tenant/sidebar-settings — owner only */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 404 });

  const { db } = await import("@/server/db");

  // Only OWNER may update
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
    select: { role: true },
  });
  if (membership?.role !== "OWNER") {
    return NextResponse.json({ error: "Kun eieren kan endre dette" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<typeof DEFAULT_SETTINGS>;
  const settings = await db.profileSidebarSettings.upsert({
    where:  { organizationId: ctx.organizationId },
    update: body,
    create: { organizationId: ctx.organizationId, ...DEFAULT_SETTINGS, ...body },
  });

  return NextResponse.json({ success: true, settings });
}
