import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/**
 * POST /api/live/polls/[pollId]/vote — submit vote
 * body: { optionId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { pollId } = await params;
  const { optionId } = await req.json() as { optionId?: string };
  if (!optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });

  const poll = await db.livePoll.findUnique({
    where:  { id: pollId },
    select: { id: true, orgId: true, status: true, options: true, createdAt: true, durationSec: true },
  });
  if (!poll || poll.status !== "OPEN") {
    return NextResponse.json({ error: "Poll er ikke åpen" }, { status: 410 });
  }

  // Expired?
  const elapsed = (Date.now() - poll.createdAt.getTime()) / 1000;
  if (elapsed >= poll.durationSec) {
    return NextResponse.json({ error: "Poll er avsluttet" }, { status: 410 });
  }

  // Validate option exists
  const validOption = (poll.options as { id: string }[]).some((o) => o.id === optionId);
  if (!validOption) return NextResponse.json({ error: "Ugyldig opsjon" }, { status: 400 });

  // Must be member of org
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: poll.orgId } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Ikke medlem" }, { status: 403 });

  // Upsert vote (single vote per user)
  await db.livePollVote.upsert({
    where:  { pollId_userId: { pollId, userId: session.user.id } },
    create: { pollId, userId: session.user.id, optionId },
    update: { optionId },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/live/polls/[pollId] — close poll early (admin/creator only)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { pollId } = await params;
  const poll = await db.livePoll.findUnique({
    where:  { id: pollId },
    select: { orgId: true, createdBy: true, status: true },
  });
  if (!poll) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Must be poll creator OR org admin/owner
  const isCreator = poll.createdBy === session.user.id;
  if (!isCreator) {
    const membership = await db.membership.findUnique({
      where:  { userId_organizationId: { userId: session.user.id, organizationId: poll.orgId } },
      select: { role: true },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
  }

  if (poll.status === "OPEN") {
    await db.livePoll.update({
      where: { id: pollId },
      data:  { status: "CLOSED", closedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
