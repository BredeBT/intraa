import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { updateLastActive } from "@/lib/updateLastActive";

// Never cache — every poll must hit the DB
export const dynamic = "force-dynamic";

/** GET /api/posts?orgId=X — returns PostWithAuthor[] for feed polling */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  void updateLastActive(session.user.id);

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  // Verify membership
  const membership = await db.membership.findFirst({
    where:  { userId: session.user.id, organizationId: orgId },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const posts = await db.post.findMany({
    where:   { orgId },
    include: {
      author:   { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
      comments: {
        include:  { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } },
        orderBy:  { createdAt: "asc" },
        take:     5, // load first 5 comments; more are fetched on demand via /api/comments
      },
      _count:   { select: { likes: true } },
      likes:    { where: { userId: session.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    20, // show 20 most recent posts
  });

  return NextResponse.json(
    posts.map((p) => ({
      id:        p.id,
      content:   p.content,
      imageUrl:  p.imageUrl,
      createdAt: p.createdAt,
      orgId:     p.orgId,
      authorId:  p.authorId,
      author:    p.author,
      comments:  p.comments,
      likeCount: p._count.likes,
      likedByMe: p.likes.length > 0,
    }))
  );
}
