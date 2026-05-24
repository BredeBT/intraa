import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

interface PostHit {
  type:        "post";
  id:          string;
  snippet:     string;
  createdAt:   string;
  author:      { id: string; name: string | null; avatarUrl: string | null };
  orgSlug:     string;
  orgName:     string;
}

interface MessageHit {
  type:       "message";
  id:         string;
  snippet:    string;
  createdAt:  string;
  author:     { id: string; name: string | null; avatarUrl: string | null };
  channelId:  string;
  channelName: string;
  orgSlug:    string;
  orgName:    string;
}

interface DmHit {
  type:        "dm";
  id:          string;
  snippet:     string;
  createdAt:   string;
  otherUser:   { id: string; name: string | null; avatarUrl: string | null };
  outgoing:    boolean;
}

type Hit = PostHit | MessageHit | DmHit;

/**
 * GET /api/search/content?q=
 * Søk i innlegg, kanal-meldinger og DM-er.
 *
 * Scope:
 *  • Innlegg: kun fra orgs brukeren er medlem av
 *  • Meldinger: kun i kanaler i orgs brukeren er medlem av
 *  • DM-er: kun hvor brukeren er sender eller receiver
 *
 * Bruker case-insensitive `contains` — ok for MVP, men full-text-search
 * (GIN trigram-index på Postgres) er neste skritt for skala.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const userId = session.user.id;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ hits: [], counts: { posts: 0, messages: 0, dms: 0 } });
  }

  // Hent alle orgs brukeren er medlem av — scope for posts + messages
  const memberships = await db.membership.findMany({
    where:  { userId },
    select: { organizationId: true },
  });
  const myOrgIds = memberships.map((m) => m.organizationId);

  const [posts, messages, dms] = await Promise.all([
    myOrgIds.length === 0 ? [] : db.post.findMany({
      where: {
        orgId:   { in: myOrgIds },
        content: { contains: q, mode: "insensitive" },
      },
      include: {
        author:       { select: { id: true, name: true, avatarUrl: true } },
        organization: { select: { slug: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    20,
    }),

    myOrgIds.length === 0 ? [] : db.message.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
        channel: { orgId: { in: myOrgIds } },
      },
      include: {
        author:  { select: { id: true, name: true, avatarUrl: true } },
        channel: {
          select: {
            id: true, name: true,
            organization: { select: { slug: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take:    20,
    }),

    db.directMessage.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender:   { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    20,
    }),
  ]);

  const hits: Hit[] = [
    ...posts.map((p): PostHit => ({
      type:      "post",
      id:        p.id,
      snippet:   stripHtml(p.content).slice(0, 200),
      createdAt: p.createdAt.toISOString(),
      author:    p.author,
      orgSlug:   p.organization.slug,
      orgName:   p.organization.name,
    })),
    ...messages.map((m): MessageHit => ({
      type:        "message",
      id:          m.id,
      snippet:     stripHtml(m.content).slice(0, 200),
      createdAt:   m.createdAt.toISOString(),
      author:      m.author,
      channelId:   m.channel.id,
      channelName: m.channel.name,
      orgSlug:     m.channel.organization.slug,
      orgName:     m.channel.organization.name,
    })),
    ...dms.map((d): DmHit => ({
      type:      "dm",
      id:        d.id,
      snippet:   stripHtml(d.content).slice(0, 200),
      createdAt: d.createdAt.toISOString(),
      otherUser: d.senderId === userId ? d.receiver : d.sender,
      outgoing:  d.senderId === userId,
    })),
  ];

  return NextResponse.json({
    hits,
    counts: { posts: posts.length, messages: messages.length, dms: dms.length },
  });
}

/** Røff fjerning av HTML-tags for snippet-visning. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
