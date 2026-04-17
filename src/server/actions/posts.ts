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
    where:  { userId: session.user.id, organizationId: orgId },
    select: { id: true },
  });
  if (!membership) throw new Error("Ikke autorisert");

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

  // Batch-check fanpass for all unique authors (posts + comments)
  const authorIds = [...new Set([
    ...posts.map((p) => p.authorId),
    ...posts.flatMap((p) => p.comments.map((c) => c.authorId)),
  ])];
  const now = new Date();
  const fanpassRows = await db.fanPass.findMany({
    where: {
      organizationId: orgId,
      userId:  { in: authorIds },
      status:  "ACTIVE",
      endDate: { gt: now },
    },
    select: { userId: true },
  });
  const fanpassSet = new Set(fanpassRows.map((r) => r.userId));

  return posts.map((p) => ({
    id:        p.id,
    content:   p.content,
    imageUrl:  p.imageUrl,
    createdAt: p.createdAt,
    orgId:     p.orgId,
    authorId:  p.authorId,
    author:    { ...p.author, hasFanpass: fanpassSet.has(p.authorId) },
    comments:  p.comments.map((c) => ({ ...c, author: { ...c.author, hasFanpass: fanpassSet.has(c.authorId) } })),
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
