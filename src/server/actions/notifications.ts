"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

export type DbNotification = {
  id:             string;
  type:           "MESSAGE" | "TICKET" | "COMMENT" | "USER";
  title:          string;
  body:           string;
  href:           string;
  createdAt:      Date;
  readAt:         Date | null;
  userId:         string;
  organizationId: string;
};

export async function getNotifications(): Promise<DbNotification[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const ctx = await getUserOrg();
  if (!ctx) return [];

  return db.notification.findMany({
    where:   { userId: session.user.id, organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
  }) as Promise<DbNotification[]>;
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

  const ctx = await getUserOrg();
  if (!ctx) return;

  await db.notification.updateMany({
    where: { userId: session.user.id, organizationId: ctx.organizationId, readAt: null },
    data:  { readAt: new Date() },
  });
}
