"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";

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

  // Fetch notifications across all orgs the user belongs to
  const memberships = await db.membership.findMany({
    where:  { userId: session.user.id },
    select: { organizationId: true },
  });

  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return [];

  const rows = await db.notification.findMany({
    where:   { userId: session.user.id, organizationId: { in: orgIds } },
    orderBy: { createdAt: "desc" },
  });

  return rows as DbNotification[];
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

  const memberships = await db.membership.findMany({
    where:  { userId: session.user.id },
    select: { organizationId: true },
  });

  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return;

  await db.notification.updateMany({
    where: { userId: session.user.id, organizationId: { in: orgIds }, readAt: null },
    data:  { readAt: new Date() },
  });
}
