"use server";

import { db } from "@/server/db";
import type { MembershipWithUser, MemberRole } from "@/lib/types";

const MOCK_MEMBERS: MembershipWithUser[] = [
  {
    id: "mock-m1",
    role: "ADMIN",
    userId: "mock-user-1",
    organizationId: "mock-org",
    user: { id: "mock-user-1", name: "Anders Sørensen", email: "anders@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-m2",
    role: "MEMBER",
    userId: "mock-user-2",
    organizationId: "mock-org",
    user: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-m3",
    role: "MEMBER",
    userId: "mock-user-3",
    organizationId: "mock-org",
    user: { id: "mock-user-3", name: "Thomas Kvam", email: "thomas@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-m4",
    role: "MEMBER",
    userId: "mock-user-4",
    organizationId: "mock-org",
    user: { id: "mock-user-4", name: "Linn Berg", email: "linn@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-m5",
    role: "OWNER",
    userId: "mock-user-5",
    organizationId: "mock-org",
    user: { id: "mock-user-5", name: "Ole Rønning", email: "ole@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
];

export async function getMembers(orgId: string): Promise<MembershipWithUser[]> {
  
  try {
    return await db.membership.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
  } catch {
    return MOCK_MEMBERS;
  }
}

export async function updateMemberRole(
  userId: string,
  orgId: string,
  role: MemberRole
): Promise<MembershipWithUser> {

  return db.membership.update({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    data: { role },
    include: { user: true },
  });
}

export async function deactivateMember(
  userId: string,
  orgId: string
): Promise<void> {

  await db.membership.delete({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
}
