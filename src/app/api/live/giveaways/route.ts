import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/giveaways?orgId=... — returns currently OPEN giveaway for the org (if any)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const ga = await db.liveGiveaway.findFirst({
    where:   { orgId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      _count:  { select: { entries: true } },
      entries: { where: { userId: session.user.id }, select: { userId: true } },
    },
  });
  if (!ga) return NextResponse.json({ giveaway: null });

  // Check if user has Fanpass (when required)
  let userMeetsFanpass = true;
  if (ga.requireFanpass) {
    const fp = await db.fanPass.findFirst({
      where: {
        userId:         session.user.id,
        organizationId: orgId,
        status:         "ACTIVE",
        endDate:        { gt: new Date() },
      },
      select: { id: true },
    });
    userMeetsFanpass = !!fp;
  }

  const secondsLeft = Math.max(0, Math.floor((ga.endsAt.getTime() - Date.now()) / 1000));

  return NextResponse.json({
    giveaway: {
      id:              ga.id,
      title:           ga.title,
      prize:           ga.prize,
      requireFanpass:  ga.requireFanpass,
      entryCount:      ga._count.entries,
      iHaveEntered:    ga.entries.length > 0,
      userMeetsFanpass,
      endsAt:          ga.endsAt.toISOString(),
      secondsLeft,
    },
  });
}

/**
 * POST /api/live/giveaways — create a new giveaway (OWNER/ADMIN only)
 * body: { orgId, title, prize, durationSec, requireFanpass? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await req.json() as {
    orgId?:          string;
    title?:          string;
    prize?:          string;
    durationSec?:    number;
    requireFanpass?: boolean;
  };
  const { orgId, title, prize, durationSec = 300, requireFanpass = false } = body;

  if (!orgId || !title?.trim() || !prize?.trim()) {
    return NextResponse.json({ error: "orgId, title og prize påkrevd" }, { status: 400 });
  }

  // Auth: must be OWNER or ADMIN
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Kun creator/admin kan starte giveaway" }, { status: 403 });
  }

  // Close any existing open giveaways for this org
  await db.liveGiveaway.updateMany({
    where: { orgId, status: "OPEN" },
    data:  { status: "CANCELLED", completedAt: new Date() },
  });

  const dur = Math.max(30, Math.min(3600, durationSec));
  const ga  = await db.liveGiveaway.create({
    data: {
      orgId,
      createdBy:      session.user.id,
      title:          title.trim().slice(0, 120),
      prize:          prize.trim().slice(0, 200),
      requireFanpass,
      endsAt:         new Date(Date.now() + dur * 1000),
    },
  });

  return NextResponse.json({ giveaway: ga });
}
