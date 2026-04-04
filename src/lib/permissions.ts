import { db } from "@/server/db";

/**
 * Returns true if the user has the isSuperAdmin flag set.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin ?? false;
}

/**
 * Returns true if the user has the OWNER role in the given community (by slug).
 */
export async function isCommunityOwner(userId: string, communitySlug: string): Promise<boolean> {
  const membership = await db.membership.findFirst({
    where: {
      userId,
      organization: { slug: communitySlug },
      role: "OWNER",
    },
  });
  return membership !== null;
}

/**
 * Returns true if the user has the OWNER or ADMIN role in the given community.
 */
export async function isCommunityAdmin(userId: string, communitySlug: string): Promise<boolean> {
  const membership = await db.membership.findFirst({
    where: {
      userId,
      organization: { slug: communitySlug },
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  return membership !== null;
}

/**
 * Returns true if the user can manage the community:
 * - Has OWNER or ADMIN role in the community, OR
 * - Is a platform superadmin.
 */
export async function canManageCommunity(userId: string, communitySlug: string): Promise<boolean> {
  const [adminAccess, superAdmin] = await Promise.all([
    isCommunityAdmin(userId, communitySlug),
    isSuperAdmin(userId),
  ]);
  return adminAccess || superAdmin;
}
