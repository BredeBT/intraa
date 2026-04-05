"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { PostWithAuthor } from "@/lib/types";

export async function getPosts(orgId: string): Promise<PostWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify user is a member of this org
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.post.findMany({
    where:   { orgId },
    include: { author: true, comments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPost(orgId: string, content: string): Promise<PostWithAuthor> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify user is a member of this org — never trust orgId from client
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  const post = await db.post.create({
    data:    { orgId, authorId: session.user.id, content },
    include: { author: true, comments: true },
  });

  revalidatePath("/feed");
  return post;
}

export async function deletePost(postId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify post belongs to user's org
  const post = await db.post.findFirst({
    where: {
      id:           postId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!post) throw new Error("Ikke autorisert");

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
}
