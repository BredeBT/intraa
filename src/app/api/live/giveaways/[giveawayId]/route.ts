import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { db } from "@/server/db";

/**
 * POST /api/live/giveaways/[id]/enter — enter the giveaway
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ giveawayId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { giveawayId } = await params;
  const ga = await db.liveGiveaway.findUnique({
    where:  { id: giveawayId },
    select: { id: true, orgId: true, status: true, endsAt: true, requireFanpass: true },
  });
  if (!ga || ga.status !== "OPEN") return NextResponse.json({ error: "Giveaway ikke åpen" }, { status: 410 });
  if (ga.endsAt < new Date())      return NextResponse.json({ error: "Giveaway har endt" }, { status: 410 });

  // Must be member
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: ga.orgId } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Ikke medlem" }, { status: 403 });

  // Fanpass check
  if (ga.requireFanpass) {
    const fp = await db.fanPass.findFirst({
      where: {
        userId:         session.user.id,
        organizationId: ga.orgId,
        status:         "ACTIVE",
        endDate:        { gt: new Date() },
      },
      select: { id: true },
    });
    if (!fp) return NextResponse.json({ error: "Krever Fanpass" }, { status: 403 });
  }

  await db.liveGiveawayEntry.upsert({
    where:  { giveawayId_userId: { giveawayId, userId: session.user.id } },
    create: { giveawayId, userId: session.user.id },
    update: {},
  });

  const count = await db.liveGiveawayEntry.count({ where: { giveawayId } });
  return NextResponse.json({ ok: true, entryCount: count });
}

/**
 * PATCH /api/live/giveaways/[id] — draw winner (creator/admin only)
 * Crypto-seeded random pick for audit trail.
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ giveawayId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { giveawayId } = await params;
  const ga = await db.liveGiveaway.findUnique({
    where:   { id: giveawayId },
    include: { entries: { select: { userId: true } } },
  });
  if (!ga) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (ga.status !== "OPEN") return NextResponse.json({ error: "Allerede ferdig" }, { status: 410 });

  // Auth check
  const isCreator = ga.createdBy === session.user.id;
  if (!isCreator) {
    const m = await db.membership.findUnique({
      where:  { userId_organizationId: { userId: session.user.id, organizationId: ga.orgId } },
      select: { role: true },
    });
    if (!m || (m.role !== "OWNER" && m.role !== "ADMIN")) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
  }

  if (ga.entries.length === 0) {
    await db.liveGiveaway.update({
      where: { id: giveawayId },
      data:  { status: "CANCELLED", completedAt: new Date() },
    });
    return NextResponse.json({ error: "Ingen deltakere — giveaway kansellert", cancelled: true }, { status: 200 });
  }

  // Cryptographic seed (so winner pick is reproducible / auditable)
  const seedBytes = crypto.randomBytes(16);
  const seed      = seedBytes.toString("hex");
  const index     = seedBytes.readUInt32BE(0) % ga.entries.length;
  const winnerId  = ga.entries[index]!.userId;

  const updated = await db.liveGiveaway.update({
    where: { id: giveawayId },
    data:  {
      status:       "COMPLETED",
      winnerUserId: winnerId,
      seed,
      completedAt:  new Date(),
    },
    include: { winner: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    ok:     true,
    winner: updated.winner,
    seed,
    totalEntries: ga.entries.length,
  });
}
