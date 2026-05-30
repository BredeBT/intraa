"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";
import { audit, AuditActions } from "@/lib/audit";
import type { PostWithAuthor } from "@/lib/types";

export async function getPosts(orgId: string): Promise<PostWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where:  { userId: session.user.id, organizationId: orgId },
    select: { id: true, role: true },
  });
  if (!membership) throw new Error("Ikke autorisert");

  const isMod = (["OWNER", "ADMIN", "MODERATOR"] as readonly string[]).includes(membership.role);

  // Skjulte posts vises bare for mods (med markering); skjulte kommentarer
  // vises som "[skjult]" for forfatter, gjemmes for andre.
  const posts = await db.post.findMany({
    where: {
      orgId,
      ...(isMod ? {} : { hiddenAt: null }),
    },
    include: {
      author:   { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
      comments: {
        where:    isMod ? {} : { hiddenAt: null },
        include:  { author: { select: { id: true, name: true, avatarUrl: true, createdAt: true } } },
        orderBy:  { createdAt: "asc" },
        take:     5, // load first 5 comments; more are fetched on demand via /api/comments
      },
      _count:   { select: { likes: true } },
      likes:    { where: { userId: session.user.id }, select: { id: true } },
      bookmarks: { where: { userId: session.user.id }, select: { id: true } },
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
    likeCount:      p._count.likes,
    likedByMe:      p.likes.length > 0,
    bookmarkedByMe: p.bookmarks.length > 0,
    hiddenAt:       p.hiddenAt,
    hiddenReason:   p.hiddenReason,
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
    include: { author: { select: { id: true, name: true, avatarUrl: true, createdAt: true } }, comments: { include: { author: { select: { id: true, name: true, avatarUrl: true, createdAt: true } } } } },
  });

  void awardCoins({ userId: session.user.id, organizationId: orgId, amount: 10, reason: "post", description: "Opprettet et innlegg" });
  revalidatePath("/feed");
  return { ...post, likeCount: 0, likedByMe: false, bookmarkedByMe: false, hiddenAt: null, hiddenReason: null };
}

const MOD_ROLES = ["OWNER", "ADMIN", "MODERATOR"] as const;

async function getPostModContext(userId: string, postId: string) {
  const post = await db.post.findUnique({
    where:  { id: postId },
    select: { id: true, authorId: true, orgId: true },
  });
  if (!post) return null;
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId, organizationId: post.orgId } },
    select: { role: true },
  });
  return {
    post,
    isAuthor: post.authorId === userId,
    isMod:    !!membership && (MOD_ROLES as readonly string[]).includes(membership.role),
  };
}

export async function deletePost(postId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const ctx = await getPostModContext(session.user.id, postId);
  if (!ctx) throw new Error("Ikke funnet");

  const isSuperAdmin = (session.user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
  if (!ctx.isAuthor && !ctx.isMod && !isSuperAdmin) throw new Error("Ikke autorisert");

  // Comments and likes cascade-delete via schema onDelete: Cascade
  await db.post.delete({ where: { id: postId } });

  // Audit-log bare når noen ANDRE enn forfatter sletter
  if (!ctx.isAuthor) {
    void audit({
      actorId:        session.user.id,
      organizationId: ctx.post.orgId,
      action:         AuditActions.POST_DELETE,
      targetType:     "post",
      targetId:       postId,
      metadata:       { originalAuthorId: ctx.post.authorId, mode: isSuperAdmin ? "superadmin" : "mod" },
    });
  }

  revalidatePath("/feed");
}

/** Skjul (soft-hide) en post — kun mods+. */
export async function hidePost(postId: string, reason?: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const ctx = await getPostModContext(session.user.id, postId);
  if (!ctx) throw new Error("Ikke funnet");
  if (!ctx.isMod) throw new Error("Krever moderator-rolle");

  await db.post.update({
    where: { id: postId },
    data:  {
      hiddenAt:     new Date(),
      hiddenById:   session.user.id,
      hiddenReason: reason?.trim().slice(0, 200) ?? null,
    },
  });
  void audit({
    actorId:        session.user.id,
    organizationId: ctx.post.orgId,
    action:         AuditActions.POST_HIDE,
    targetType:     "post",
    targetId:       postId,
    metadata:       { originalAuthorId: ctx.post.authorId, reason: reason?.trim() ?? null },
  });
  revalidatePath("/feed");
}

/** Gjør synlig igjen — kun mods+. */
export async function unhidePost(postId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const ctx = await getPostModContext(session.user.id, postId);
  if (!ctx) throw new Error("Ikke funnet");
  if (!ctx.isMod) throw new Error("Krever moderator-rolle");

  await db.post.update({
    where: { id: postId },
    data:  { hiddenAt: null, hiddenById: null, hiddenReason: null },
  });
  void audit({
    actorId:        session.user.id,
    organizationId: ctx.post.orgId,
    action:         AuditActions.POST_UNHIDE,
    targetType:     "post",
    targetId:       postId,
  });
  revalidatePath("/feed");
}
