import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/**
 * DELETE — remove a story (author or org OWNER/ADMIN)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { storyId } = await params;

  const story = await db.story.findUnique({
    where:  { id: storyId },
    select: { authorId: true, channel: { select: { orgId: true } } },
  });
  if (!story) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const isAuthor = story.authorId === session.user.id;
  if (!isAuthor) {
    const membership = await db.membership.findUnique({
      where:  { userId_organizationId: { userId: session.user.id, organizationId: story.channel.orgId } },
      select: { role: true },
    });
    const isStaff = membership?.role === "OWNER" || membership?.role === "ADMIN";
    if (!isStaff) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  await db.story.delete({ where: { id: storyId } });
  return NextResponse.json({ ok: true });
}
