"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { PostWithAuthor } from "@/lib/types";

export async function getPosts(orgId: string): Promise<PostWithAuthor[]> {
  return db.post.findMany({
    where: { orgId },
    include: { author: true, comments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPost(orgId: string, content: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  await db.post.create({
    data: { orgId, authorId: session.user.id, content },
  });

  revalidatePath("/feed");
}

export async function deletePost(postId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
}
