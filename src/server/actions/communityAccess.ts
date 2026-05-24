"use server";

import { db } from "@/server/db";

/**
 * Check whether a user has access to read a specific channel.
 * Centralized so we don't duplicate this logic in 5 places.
 */
export async function userCanAccessChannel(
  userId:    string,
  channelId: string,
): Promise<{ canAccess: boolean; reason?: "not-member" | "fanpass-required" }> {
  const channel = await db.channel.findUnique({
    where:  { id: channelId },
    select: { orgId: true, requiresFanpass: true, type: true },
  });
  if (!channel) return { canAccess: false, reason: "not-member" };

  // Must be a member of the org
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId, organizationId: channel.orgId } },
    select: { id: true },
  });
  if (!membership) return { canAccess: false, reason: "not-member" };

  // Fanpass-locked channel: check active Fanpass
  if (channel.requiresFanpass) {
    const fanpass = await db.fanPass.findFirst({
      where: {
        userId,
        organizationId: channel.orgId,
        status:         "ACTIVE",
        endDate:        { gt: new Date() },
      },
      select: { id: true },
    });
    if (!fanpass) return { canAccess: false, reason: "fanpass-required" };
  }

  return { canAccess: true };
}

/**
 * Check whether a user has active Fanpass for the given org.
 * Convenience helper used by feed / sidebar to decide what to show.
 */
export async function hasActiveFanpass(userId: string, orgId: string): Promise<boolean> {
  const fanpass = await db.fanPass.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status:         "ACTIVE",
      endDate:        { gt: new Date() },
    },
    select: { id: true },
  });
  return !!fanpass;
}
