import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";

/** GET /api/comments?postId=X — list comments with authors */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "Mangler postId" }, { status: 400 });

  // Verify user has access to the org this post belongs to
  const post = await db.post.findFirst({
    where: {
      id:           postId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const comments = await db.comment.findMany({
    where:   { postId },
    include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

/** POST /api/comments — create a comment */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { postId, content } = await request.json() as { postId?: string; content?: string };
  if (!postId || !content?.trim()) {
    return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
  }

  // Verify user is a member of the org this post belongs to
  const post = await db.post.findFirst({
    where: {
      id:           postId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const postWithOrg = await db.post.findUnique({ where: { id: postId }, select: { orgId: true } });

  const comment = await db.comment.create({
    data:    { postId, content: content.trim(), authorId: session.user.id },
    include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } },
  });

  if (postWithOrg) {
    void awardCoins({ userId: session.user.id, organizationId: postWithOrg.orgId, amount: 5, reason: "comment", description: "Kommenterte et innlegg" });
  }

  return NextResponse.json(comment, { status: 201 });
}
