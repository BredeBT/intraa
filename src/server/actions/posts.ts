"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";
import type { PostWithAuthor } from "@/lib/types";

export async function getPosts(orgId: string): Promise<PostWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  const posts = await db.post.findMany({
    where:   { orgId },
    include: {
      author:   { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
      comments: { include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } }, orderBy: { createdAt: "asc" } },
      _count:   { select: { likes: true } },
      likes:    { where: { userId: session.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((p) => ({
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
  }));
}

export async function createPost(orgId: string, content: string, imageUrl?: string): Promise<PostWithAuthor> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  console.log("[createPost] orgId:", orgId, "userId:", session.user.id, "content length:", content?.length);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  console.log("[createPost] membership:", membership?.id ?? "IKKE FUNNET");
  if (!membership) throw new Error("Ikke autorisert");

  const post = await db.post.create({
    data:    { orgId, authorId: session.user.id, content, imageUrl: imageUrl ?? null },
    include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } }, comments: { include: { author: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } } } },
  });

  void awardCoins({ userId: session.user.id, organizationId: orgId, amount: 10, reason: "post", description: "Opprettet et innlegg" });
  revalidatePath("/feed");
  return { ...post, likeCount: 0, likedByMe: false };
}

export async function deletePost(postId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Ikke funnet");

  const isAuthor     = post.authorId === session.user.id;
  const isSuperAdmin = (session.user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
  if (!isAuthor && !isSuperAdmin) throw new Error("Ikke autorisert");

  // Comments and likes cascade-delete via schema onDelete: Cascade
  await db.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
}
