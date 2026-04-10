"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";

export type PendingInvitation = {
  id:            string;
  token:         string;
  orgName:       string;
  invitedByName: string;
};

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const invitations = await db.invitation.findMany({
    where: {
      email:     session.user.email,
      status:    "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: { select: { name: true } },
      invitedBy:    { select: { name: true } },
    },
  });

  return invitations.map((inv) => ({
    id:            inv.id,
    token:         inv.token,
    orgName:       inv.organization.name,
    invitedByName: inv.invitedBy.name ?? "Ukjent",
  }));
}
