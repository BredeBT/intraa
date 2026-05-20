import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/**
 * POST — mark a story as viewed by the current user.
 * Upsert so duplicate views are silent no-ops.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { storyId } = await params;

  // Don't track creator viewing their own story
  const story = await db.story.findUnique({
    where:  { id: storyId },
    select: { authorId: true, channel: { select: { orgId: true, requiresFanpass: true } } },
  });
  if (!story) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (story.authorId === session.user.id) {
    return NextResponse.json({ ok: true, skipped: "own" });
  }

  await db.storyView.upsert({
    where:  { storyId_userId: { storyId, userId: session.user.id } },
    create: { storyId, userId: session.user.id },
    update: {}, // viewedAt stays at first view
  });

  return NextResponse.json({ ok: true });
}
