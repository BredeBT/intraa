"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { addPoints } from "@/server/addPoints";

export async function createComment(postId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const post = await db.post.findFirst({
    where: {
      id:           postId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!post) throw new Error("Ikke autorisert");

  const comment = await db.comment.create({
    data:    { postId, authorId: session.user.id, content },
    include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } },
  });

  void addPoints(session.user.id, post.orgId, "COMMENT");
  return comment;
}
