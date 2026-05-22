"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";

export type NotifTypeAll =
  | "MESSAGE" | "MENTION" | "REPLY" | "COMMENT" | "LIKE" | "TICKET" | "USER"
  | "FRIEND_REQUEST" | "FRIEND_ACCEPTED"
  | "CALL_INCOMING"  | "CALL_MISSED"
  | "CHESS_INVITE"   | "CHESS_MOVE"    | "CHESS_RESULT"
  | "BROADCAST"      | "STORY"
  | "FANPASS_GRANTED" | "FANPASS_EXPIRING" | "SPONSOR_TAG";

export type DbNotification = {
  id:             string;
  type:           NotifTypeAll;
  title:          string;
  body:           string;
  href:           string;
  iconUrl:        string | null;
  metadata:       Record<string, unknown> | null;
  priority:       number;
  expiresAt:      Date | null;
  createdAt:      Date;
  readAt:         Date | null;
  userId:         string;
  organizationId: string | null;
};

export async function getNotifications(): Promise<DbNotification[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const now = new Date();
  const rows = await db.notification.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take:    100,
  });

  return rows as unknown as DbNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data:  { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  });
}

export async function deleteNotification(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  await db.notification.deleteMany({
    where: { id, userId: session.user.id },
  });
}

export async function clearReadNotifications(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Delete all read + expired notifications
  await db.notification.deleteMany({
    where: {
      userId: session.user.id,
      OR: [
        { readAt: { not: null } },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });
}
