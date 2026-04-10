import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/** POST /api/likes — toggle like on a post */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { postId } = await request.json() as { postId?: string };
  if (!postId) return NextResponse.json({ error: "Mangler postId" }, { status: 400 });

  // Verify user is a member of the org this post belongs to
  const post = await db.post.findFirst({
    where: {
      id:           postId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
    select: { id: true, orgId: true },
  });
  if (!post) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const existing = await db.like.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  if (existing) {
    await db.like.delete({ where: { postId_userId: { postId, userId: session.user.id } } });
    return NextResponse.json({ liked: false });
  }

  await db.like.create({
    data: { postId, userId: session.user.id, organizationId: post.orgId },
  });
  return NextResponse.json({ liked: true });
}
