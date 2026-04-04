"use server";

import { db } from "@/server/db";
import type { PostWithAuthor } from "@/lib/types";

const MOCK_POSTS: PostWithAuthor[] = [
  {
    id: "mock-1",
    content: "Hei alle sammen! Vi har nettopp lansert den nye onboarding-prosessen. Ta en titt og gi tilbakemelding 🙌",
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
    orgId: "mock-org",
    authorId: "mock-user-1",
    author: { id: "mock-user-1", name: "Anders Sørensen", email: "anders@intraa.no", avatarUrl: null, createdAt: new Date() },
    comments: [],
  },
  {
    id: "mock-2",
    content: "Påminnelse: Allmøte fredag kl. 10:00 i store møterom. Husk å melde deg på i kalenderen.",
    createdAt: new Date(Date.now() - 1000 * 60 * 240),
    orgId: "mock-org",
    authorId: "mock-user-2",
    author: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
    comments: [],
  },
  {
    id: "mock-3",
    content: "Delte noen notater fra designworkshopen i går. Finn dem under Filer → Design → 2026.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    orgId: "mock-org",
    authorId: "mock-user-3",
    author: { id: "mock-user-3", name: "Thomas Kvam", email: "thomas@intraa.no", avatarUrl: null, createdAt: new Date() },
    comments: [],
  },
];

export async function getPosts(orgId: string): Promise<PostWithAuthor[]> {
  if (!db) return MOCK_POSTS;
  try {
    return await db.post.findMany({
      where: { orgId },
      include: { author: true, comments: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return MOCK_POSTS;
  }
}

export async function createPost(
  orgId: string,
  authorId: string,
  content: string
): Promise<PostWithAuthor> {
  if (!db) throw new Error("Database ikke tilgjengelig");
  return db.post.create({
    data: { orgId, authorId, content },
    include: { author: true, comments: true },
  });
}

export async function deletePost(postId: string): Promise<void> {
  if (!db) throw new Error("Database ikke tilgjengelig");
  await db.post.delete({ where: { id: postId } });
}
