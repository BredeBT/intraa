"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";
import { getUserOrg } from "@/server/getUserOrg";
import type { MessageWithAuthor, ReactionGroup } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PrismaMsg = {
  id:              string;
  content:         string;
  imageUrl:        string | null;
  createdAt:       Date;
  editedAt:        Date | null;
  isPinned:        boolean;
  channelId:       string;
  authorId:        string;
  parentMessageId: string | null;
  author: {
    id:        string;
    email:     string;
    name:      string | null;
    avatarUrl: string | null;
    createdAt: Date;
  };
  reactions: { emoji: string; userId: string }[];
  replies: (PrismaMsg & { reactions: { emoji: string; userId: string }[]; replies: never[] })[];
  _count: { replies: number };
};

function mapMessage(m: PrismaMsg, userId: string, fanpassSet?: Set<string>): MessageWithAuthor {
  const grouped: Record<string, ReactionGroup> = {};
  for (const r of m.reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, reactedByMe: false };
    grouped[r.emoji].count++;
    if (r.userId === userId) grouped[r.emoji].reactedByMe = true;
  }
  return {
    id:              m.id,
    content:         m.content,
    imageUrl:        m.imageUrl,
    createdAt:       m.createdAt,
    editedAt:        m.editedAt,
    isPinned:        m.isPinned,
    channelId:       m.channelId,
    authorId:        m.authorId,
    parentMessageId: m.parentMessageId,
    author: {
      id:         m.author.id,
      email:      m.author.email,
      name:       m.author.name,
      avatarUrl:  m.author.avatarUrl,
      createdAt:  m.author.createdAt,
      hasFanpass: fanpassSet ? fanpassSet.has(m.author.id) : false,
    },
    reactions:  Object.values(grouped),
    replyCount: m._count.replies,
    replies:    (m.replies ?? []).map((r) => mapMessage(r as PrismaMsg, userId, fanpassSet)),
  };
}

/** Batch-fetch fanpass status for a set of userIds in a given org. */
async function getFanpassSet(userIds: string[], orgId: string): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const now = new Date();
  const rows = await db.fanPass.findMany({
    where: {
      organizationId: orgId,
      userId:  { in: userIds },
      status:  "ACTIVE",
      endDate: { gt: now },
    },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

const AUTHOR_SELECT = { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } } as const;

const MSG_INCLUDE = {
  author:    AUTHOR_SELECT,
  reactions: { select: { emoji: true, userId: true } },
  replies: {
    where:   { parentMessageId: { not: null } },
    include: {
      author:    AUTHOR_SELECT,
      reactions: { select: { emoji: true, userId: true } },
      replies:   false,
      _count:    { select: { replies: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { replies: true } },
} as const;

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getMessages(channelId: string, afterId?: string): Promise<MessageWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const channel = await db.channel.findFirst({
    where: {
      id:           channelId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!channel) throw new Error("Ikke autorisert");

  const rows = await db.message.findMany({
    where:   { channelId, parentMessageId: null },
    include: MSG_INCLUDE,
    orderBy: { createdAt: "asc" },
    ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
  });

  // Batch-check fanpass for all unique authors
  const authorIds = [...new Set([
    ...rows.map((m) => m.authorId),
    ...rows.flatMap((m) => (m.replies ?? []).map((r) => r.authorId)),
  ])];
  const fanpassSet = await getFanpassSet(authorIds, channel.orgId);

  return rows.map((m) => mapMessage(m as unknown as PrismaMsg, session.user!.id!, fanpassSet));
}

export async function getPinnedMessages(channelId: string): Promise<MessageWithAuthor[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const channel = await db.channel.findFirst({
    where: {
      id:           channelId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!channel) throw new Error("Ikke autorisert");

  const rows = await db.message.findMany({
    where:   { channelId, isPinned: true, parentMessageId: null },
    include: MSG_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((m) => mapMessage(m as unknown as PrismaMsg, session.user!.id!));
}

/** Finds or creates a DIRECT channel between the current user and otherUserId. */
export async function getOrCreateDmChannel(otherUserId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const ctx = await getUserOrg();
  if (!ctx) throw new Error("Ingen organisasjon");
  const { organizationId } = ctx;
  const myId = session.user.id;

  const [myMembership, otherMembership] = await Promise.all([
    db.membership.findUnique({ where: { userId_organizationId: { userId: myId,        organizationId } } }),
    db.membership.findUnique({ where: { userId_organizationId: { userId: otherUserId, organizationId } } }),
  ]);
  if (!myMembership || !otherMembership) throw new Error("Ikke autorisert");

  const [a, b] = [myId, otherUserId].sort();
  const channelName = `dm-${a}-${b}`;

  const channel = await db.channel.upsert({
    where:  { orgId_name: { orgId: organizationId, name: channelName } },
    create: { orgId: organizationId, name: channelName, type: "DIRECT" },
    update: {},
  });

  return channel.id;
}

export async function sendMessage(
  channelId:       string,
  content:         string,
  parentMessageId?: string,
  imageUrl?:        string,
): Promise<MessageWithAuthor> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const channel = await db.channel.findFirst({
    where: {
      id:           channelId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!channel) throw new Error("Ikke autorisert");

  const message = await db.message.create({
    data:    { channelId, authorId: session.user.id, content, parentMessageId: parentMessageId ?? null, imageUrl: imageUrl ?? null },
    include: { ...MSG_INCLUDE },
  });

  // Notify @mentioned users
  void notifyMentions(content, channel.orgId, session.user.id, channelId);

  void awardCoins({ userId: session.user.id, organizationId: channel.orgId, amount: 2, reason: "chat", description: "Sendte en melding i chat" });
  const fanpassSet = await getFanpassSet([session.user.id], channel.orgId);
  return mapMessage(message as unknown as PrismaMsg, session.user.id, fanpassSet);
}

export async function editMessage(messageId: string, content: string): Promise<MessageWithAuthor> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const msg = await db.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error("Ikke funnet");
  if (msg.authorId !== session.user.id) throw new Error("Ingen tilgang");

  const updated = await db.message.update({
    where:   { id: messageId },
    data:    { content: content.trim(), editedAt: new Date() },
    include: MSG_INCLUDE,
  });

  return mapMessage(updated as unknown as PrismaMsg, session.user.id);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const msg = await db.message.findUnique({
    where:   { id: messageId },
    include: { channel: { include: { organization: { include: { memberships: { where: { userId: session.user.id } } } } } } },
  });
  if (!msg) throw new Error("Ikke funnet");

  const membership = msg.channel.organization.memberships[0];
  const isAdminOrOwner = membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (msg.authorId !== session.user.id && !isAdminOrOwner) throw new Error("Ingen tilgang");

  await db.message.delete({ where: { id: messageId } });
}

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const existing = await db.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } },
  });

  if (existing) {
    await db.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await db.messageReaction.create({ data: { messageId, userId: session.user.id, emoji } });
  }
}

export async function pinMessage(messageId: string, isPinned: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const msg = await db.message.findUnique({
    where:   { id: messageId },
    include: { channel: { include: { organization: { include: { memberships: { where: { userId: session.user.id } } } } } } },
  });
  if (!msg) throw new Error("Ikke funnet");

  const membership = msg.channel.organization.memberships[0];
  const canPin = membership?.role === "OWNER" || membership?.role === "ADMIN" || membership?.role === "MODERATOR";
  if (!canPin) throw new Error("Ingen tilgang");

  await db.message.update({ where: { id: messageId }, data: { isPinned } });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function notifyMentions(content: string, orgId: string, senderId: string, channelId: string) {
  const matches = content.match(/@([\w\s]+?)(?=\s|$|[^a-zA-Z\s])/g);
  if (!matches) return;

  const names = matches.map((m) => m.slice(1).trim()).filter(Boolean);
  if (names.length === 0) return;

  const users = await db.user.findMany({
    where: {
      name: { in: names },
      memberships: { some: { organizationId: orgId } },
    },
    select: { id: true },
  });

  const targets = users.filter((u) => u.id !== senderId);
  if (targets.length === 0) return;

  await db.notification.createMany({
    data: targets.map((u) => ({
      type:           "MESSAGE" as const,
      title:          "Du ble nevnt",
      body:           content.slice(0, 100),
      href:           `/chat`,
      userId:         u.id,
      organizationId: orgId,
    })),
    skipDuplicates: true,
  });
}
