import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET — list all active (not expired) stories in this channel, grouped by author.
 * Returns: { groups: [{ author, stories: [...] }] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { channelId } = await params;

  const channel = await db.channel.findUnique({
    where:  { id: channelId },
    select: { id: true, orgId: true, type: true, requiresFanpass: true },
  });
  if (!channel) return NextResponse.json({ error: "Kanal ikke funnet" }, { status: 404 });

  // Must be member of org
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: channel.orgId } },
    select: { id: true, role: true },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  // Fanpass-locked channel: require Fanpass (except staff)
  if (channel.requiresFanpass) {
    const isStaff = membership.role === "OWNER" || membership.role === "ADMIN";
    if (!isStaff) {
      const fp = await db.fanPass.findFirst({
        where: {
          userId:         session.user.id,
          organizationId: channel.orgId,
          status:         "ACTIVE",
          endDate:        { gt: new Date() },
        },
        select: { id: true },
      });
      if (!fp) return NextResponse.json({ error: "Krever Fanpass" }, { status: 403 });
    }
  }

  const stories = await db.story.findMany({
    where:   { channelId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Batch-fetch which of these stories the user has viewed
  const myViews = stories.length > 0
    ? await db.storyView.findMany({
        where:  { userId: session.user.id, storyId: { in: stories.map((s) => s.id) } },
        select: { storyId: true },
      })
    : [];
  const viewedSet = new Set(myViews.map((v) => v.storyId));

  // Group by author
  const groupMap = new Map<string, { author: { id: string; name: string | null; avatarUrl: string | null }; stories: typeof stories }>();
  for (const s of stories) {
    if (!groupMap.has(s.authorId)) groupMap.set(s.authorId, { author: s.author, stories: [] });
    groupMap.get(s.authorId)!.stories.push(s);
  }

  const groups = Array.from(groupMap.values()).map((g) => ({
    author: g.author,
    stories: g.stories.map((s) => ({
      id:           s.id,
      imageUrl:     s.imageUrl,
      caption:      s.caption,
      width:        s.width,
      height:       s.height,
      createdAt:    s.createdAt.toISOString(),
      expiresAt:    s.expiresAt.toISOString(),
      // Creator's own stories: always treated as "viewed" so they get gray ring
      viewedByMe:   s.authorId === session.user.id || viewedSet.has(s.id),
    })),
  }));

  return NextResponse.json({ groups });
}

/**
 * POST — create a new story.
 * Body: { imageUrl, caption?, width?, height? }
 * Only OWNER/ADMIN can post (since broadcast is one-way).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { channelId } = await params;
  const body = await req.json() as { imageUrl?: string; caption?: string; width?: number; height?: number };
  if (!body.imageUrl) return NextResponse.json({ error: "imageUrl mangler" }, { status: 400 });

  const channel = await db.channel.findUnique({
    where:  { id: channelId },
    select: { id: true, orgId: true, type: true },
  });
  if (!channel) return NextResponse.json({ error: "Kanal ikke funnet" }, { status: 404 });

  // Only OWNER/ADMIN can post stories in broadcast channels
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: channel.orgId } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Kun creator kan poste stories" }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const story = await db.story.create({
    data: {
      channelId,
      authorId: session.user.id,
      imageUrl: body.imageUrl,
      caption:  body.caption ?? null,
      width:    body.width  ?? null,
      height:   body.height ?? null,
      expiresAt,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    id:        story.id,
    imageUrl:  story.imageUrl,
    caption:   story.caption,
    width:     story.width,
    height:    story.height,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
    author:    story.author,
  });
}
