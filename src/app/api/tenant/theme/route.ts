import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

export const dynamic = "force-dynamic";

/** GET /api/tenant/theme — returns theme for current org */
export async function GET() {
  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ theme: null });

  const theme = await db.tenantTheme.findUnique({
    where: { organizationId: ctx.organizationId },
  });

  return NextResponse.json({ theme });
}

/** PATCH /api/tenant/theme — upserts theme, requires OWNER or ADMIN */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen organisasjon" }, { status: 400 });

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  const body = (await request.json()) as {
    logoUrl?:        string | null;
    bannerUrl?:      string | null;
    bannerPreset?:   string | null;
    avatarPreset?:   string | null;
    borderRadius?:   string;
    fontStyle?:      string;
    welcomeMessage?: string;
  };

  const VALID_RADII   = ["rounded-none", "rounded-sm", "rounded-lg", "rounded-xl", "rounded-2xl"];
  const VALID_FONTS   = ["default", "modern", "classic", "mono"];
  if (body.borderRadius && !VALID_RADII.includes(body.borderRadius))
    return NextResponse.json({ error: "Ugyldig hjørnestil" }, { status: 400 });
  if (body.fontStyle && !VALID_FONTS.includes(body.fontStyle))
    return NextResponse.json({ error: "Ugyldig fontstil" }, { status: 400 });

  console.log("[tenant/theme] Lagrer:", {
    orgId:     ctx.organizationId,
    logoUrl:   body.logoUrl?.substring(0, 60),
    bannerUrl: body.bannerUrl?.substring(0, 60),
    borderRadius: body.borderRadius,
    fontStyle: body.fontStyle,
  });
  try {
    const theme = await db.tenantTheme.upsert({
      where:  { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...body },
      update: body,
    });
    console.log("[tenant/theme] Lagret OK:", { id: theme.id, orgId: theme.organizationId });
    return NextResponse.json({ theme });
  } catch (error) {
    console.error("[tenant/theme] PATCH feil:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
