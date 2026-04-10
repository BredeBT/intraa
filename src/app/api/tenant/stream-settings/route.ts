import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

export const dynamic = "force-dynamic";

/** GET /api/tenant/stream-settings */
export async function GET() {
  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ settings: null });

  const settings = await db.streamSettings.findUnique({
    where: { organizationId: ctx.organizationId },
  });

  return NextResponse.json({ settings });
}

/** PATCH /api/tenant/stream-settings — requires OWNER or ADMIN */
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
    twitchChannel?:     string | null;
    youtubeChannel?:    string | null;
    preferredPlatform?: string;
  };

  if (body.preferredPlatform && !["twitch", "youtube"].includes(body.preferredPlatform)) {
    return NextResponse.json({ error: "Ugyldig plattform" }, { status: 400 });
  }

  console.log("[tenant/stream-settings] Lagrer:", { orgId: ctx.organizationId, ...body });
  try {
    const settings = await db.streamSettings.upsert({
      where:  { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...body },
      update: body,
    });
    console.log("[tenant/stream-settings] Lagret OK:", { id: settings.id });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[tenant/stream-settings] PATCH feil:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
