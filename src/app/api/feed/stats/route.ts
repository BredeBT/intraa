import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Returnerer "decorative" stats for feed-siden: aktive brukere, ukestall, stories.
 * Splittet ut fra page.tsx slik at first-paint ikke venter på disse.
 *
 * GET /api/feed/stats?orgId=X
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where:  { userId: session.user.id, organizationId: orgId },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const now        = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const weekAgo    = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo     = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [onlineUsers, weekPostCount, weekFanpassCount, activeStories] = await Promise.all([
    db.user.findMany({
      where: {
        memberships: { some: { organizationId: orgId } },
        lastActive:  { gte: fiveMinAgo },
      },
      orderBy: { lastActive: "desc" },
      select:  { id: true, name: true, username: true, avatarUrl: true },
      take:    12,
    }),
    db.post.count({
      where: { orgId, createdAt: { gte: weekAgo } },
    }),
    db.fanPass.count({
      where: {
        organizationId: orgId,
        startDate:      { gte: weekAgo },
        status:         "ACTIVE",
      },
    }),
    db.story.count({
      where: {
        channel:   { orgId },
        createdAt: { gte: dayAgo },
        expiresAt: { gt: now },
      },
    }),
  ]);

  return NextResponse.json(
    {
      onlineUsers,
      onlineCount:       onlineUsers.length,
      weekPostCount,
      weekFanpassCount,
      activeStoriesCount: activeStories,
    },
    { headers: { "Cache-Control": "private, max-age=15" } },
  );
}
