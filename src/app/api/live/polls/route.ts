import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/polls?orgId=... — returns currently OPEN poll for the org (if any)
 *
 * Returns { poll: { id, question, options[{id, label, votes}], totalVotes, myVoteId, secondsLeft, closesAt } | null }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const poll = await db.livePoll.findFirst({
    where:   { orgId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { votes: { select: { userId: true, optionId: true } } },
  });
  if (!poll) return NextResponse.json({ poll: null });

  // Auto-close if duration elapsed
  const elapsed = (Date.now() - poll.createdAt.getTime()) / 1000;
  if (elapsed >= poll.durationSec) {
    await db.livePoll.update({
      where: { id: poll.id },
      data:  { status: "CLOSED", closedAt: new Date() },
    });
    return NextResponse.json({ poll: null });
  }

  // Tally votes per option
  const counts: Record<string, number> = {};
  for (const v of poll.votes) counts[v.optionId] = (counts[v.optionId] ?? 0) + 1;

  const rawOptions = poll.options as { id: string; label: string }[];
  const options = rawOptions.map((o) => ({ id: o.id, label: o.label, votes: counts[o.id] ?? 0 }));

  const myVote = poll.votes.find((v) => v.userId === session.user!.id);
  const closesAt = new Date(poll.createdAt.getTime() + poll.durationSec * 1000);
  const secondsLeft = Math.max(0, Math.floor((closesAt.getTime() - Date.now()) / 1000));

  return NextResponse.json({
    poll: {
      id:           poll.id,
      question:     poll.question,
      options,
      totalVotes:   poll.votes.length,
      myVoteId:     myVote?.optionId ?? null,
      secondsLeft,
      closesAt:     closesAt.toISOString(),
    },
  });
}

/**
 * POST /api/live/polls — create a new poll (OWNER/ADMIN only)
 * body: { orgId, question, options: string[], durationSec? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await req.json() as {
    orgId?:       string;
    question?:    string;
    options?:     string[];
    durationSec?: number;
  };
  const { orgId, question, options, durationSec = 60 } = body;

  if (!orgId || !question?.trim() || !options || options.length < 2) {
    return NextResponse.json({ error: "orgId, question og minst 2 options påkrevd" }, { status: 400 });
  }

  // Auth: must be OWNER or ADMIN
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Kun creator/admin kan starte polls" }, { status: 403 });
  }

  // Close any existing open polls
  await db.livePoll.updateMany({
    where: { orgId, status: "OPEN" },
    data:  { status: "CLOSED", closedAt: new Date() },
  });

  const cleanOptions = options
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6) // max 6 options
    .map((label, i) => ({ id: `opt-${i}`, label }));

  const poll = await db.livePoll.create({
    data: {
      orgId,
      createdBy:   session.user.id,
      question:    question.trim().slice(0, 200),
      options:     cleanOptions,
      durationSec: Math.max(10, Math.min(600, durationSec)),
    },
  });

  return NextResponse.json({ poll });
}
