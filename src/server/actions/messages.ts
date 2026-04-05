"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import type { MessageWithAuthor } from "@/lib/types";

export async function getMessages(channelId: string): Promise<MessageWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify this channel belongs to an org the user is a member of
  const channel = await db.channel.findFirst({
    where: {
      id:           channelId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!channel) throw new Error("Ikke autorisert");

  return db.message.findMany({
    where:   { channelId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(
  channelId: string,
  content: string,
): Promise<MessageWithAuthor> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify this channel belongs to an org the user is a member of
  const channel = await db.channel.findFirst({
    where: {
      id:           channelId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!channel) throw new Error("Ikke autorisert");

  return db.message.create({
    data:    { channelId, authorId: session.user.id, content },
    include: { author: true },
  });
}
