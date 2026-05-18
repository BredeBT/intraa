"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { CommunityAccessMode } from "@prisma/client";

type Result = { success: true } | { success: false; error: string };

/**
 * Set the community's access mode and side-effect resources:
 *  - FREEMIUM / EXCLUSIVE: auto-create a BROADCAST channel if none exists
 *  - OPEN: leave broadcast channel(s) alone (owner can delete manually if wanted)
 *
 * Only org owner / admin can change the mode.
 */
export async function setAccessMode(
  orgSlug: string,
  mode:    CommunityAccessMode,
): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Ikke logget inn" };

  const org = await db.organization.findUnique({
    where:   { slug: orgSlug },
    select:  { id: true, accessMode: true },
  });
  if (!org) return { success: false, error: "Community ikke funnet" };

  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return { success: false, error: "Du må være eier eller admin" };
  }

  // Update the mode
  await db.organization.update({
    where: { id: org.id },
    data:  { accessMode: mode },
  });

  // Auto-create broadcast channel when entering FREEMIUM/EXCLUSIVE for the first time
  if (mode === "FREEMIUM" || mode === "EXCLUSIVE") {
    const existing = await db.channel.findFirst({
      where:  { orgId: org.id, type: "BROADCAST" },
      select: { id: true },
    });
    if (!existing) {
      // Find a free name (broadcast might already exist as TEXT in unlikely case)
      let name = "innenfor-sirkelen";
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const taken = await db.channel.findUnique({
          where:  { orgId_name: { orgId: org.id, name } },
          select: { id: true },
        });
        if (!taken) break;
        suffix += 1;
        name = `innenfor-sirkelen-${suffix}`;
      }
      await db.channel.create({
        data: {
          orgId:           org.id,
          name,
          type:            "BROADCAST",
          requiresFanpass: true,
          description:     "Eksklusiv kanal for Fanpass-medlemmer. Bare creator kan poste.",
        },
      });
    }
  }

  revalidatePath(`/community/${orgSlug}/admin/tilgang`);
  revalidatePath(`/community/${orgSlug}`);
  revalidatePath(`/meldinger`);
  return { success: true };
}

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
