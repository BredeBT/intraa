"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import type { MembershipWithUser, MemberRole } from "@/lib/types";

export async function getMembers(orgId: string): Promise<MembershipWithUser[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.membership.findMany({
    where:   { organizationId: orgId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
}

export async function updateMemberRole(
  userId: string,
  orgId: string,
  role: MemberRole,
): Promise<MembershipWithUser> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Only OWNER or ADMIN can change roles
  const requester = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!requester) throw new Error("Ikke autorisert");

  return db.membership.update({
    where:   { userId_organizationId: { userId, organizationId: orgId } },
    data:    { role },
    include: { user: true },
  });
}

export async function deactivateMember(userId: string, orgId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Only OWNER or ADMIN can remove members
  const requester = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!requester) throw new Error("Ikke autorisert");

  await db.membership.delete({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
}
