import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/history?orgId=... — past polls + giveaways for Studio panel.
 * Returns last 20 of each, with results / winners.
 *
 * Auth: OWNER/ADMIN only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const [polls, giveaways] = await Promise.all([
    db.livePoll.findMany({
      where:   { orgId, status: "CLOSED" },
      orderBy: { createdAt: "desc" },
      take:    20,
      include: { votes: { select: { optionId: true } } },
    }),
    db.liveGiveaway.findMany({
      where:   { orgId, status: { in: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take:    20,
      include: {
        winner:  { select: { id: true, name: true, username: true, avatarUrl: true } },
        _count:  { select: { entries: true } },
      },
    }),
  ]);

  const pollResults = polls.map((p) => {
    const counts: Record<string, number> = {};
    for (const v of p.votes) counts[v.optionId] = (counts[v.optionId] ?? 0) + 1;
    const options = (p.options as { id: string; label: string }[]).map((o) => ({
      id:    o.id,
      label: o.label,
      votes: counts[o.id] ?? 0,
    }));
    options.sort((a, b) => b.votes - a.votes);
    return {
      id:         p.id,
      question:   p.question,
      options,
      totalVotes: p.votes.length,
      createdAt:  p.createdAt.toISOString(),
      closedAt:   p.closedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    polls:     pollResults,
    giveaways: giveaways.map((g) => ({
      id:           g.id,
      title:        g.title,
      prize:        g.prize,
      status:       g.status,
      entryCount:   g._count.entries,
      winner:       g.winner,
      createdAt:    g.createdAt.toISOString(),
      completedAt:  g.completedAt?.toISOString() ?? null,
    })),
  });
}
