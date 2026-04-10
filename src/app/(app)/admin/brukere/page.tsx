import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import BrukereClient from "./BrukereClient";

export default async function BrukerePage() {
  const { organizationId, userId } = await requireAdmin();

  const [memberships, org, pendingInvites] = await Promise.all([
    db.membership.findMany({
      where:   { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.organization.findUnique({
      where:  { id: organizationId },
      select: { type: true },
    }),
    db.invitation.findMany({
      where:   { organizationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, token: true, email: true, role: true, createdAt: true, expiresAt: true },
    }),
  ]);

  const members = memberships.map((m) => ({
    membershipId: m.id,
    userId:       m.userId,
    name:         m.user.name ?? "Ukjent",
    email:        m.user.email,
    role:         m.role,
    username:     m.username,
    isMe:         m.userId === userId,
    isBanned:     m.isBanned,
  }));

  const invitations = pendingInvites.map((inv) => ({
    id:        inv.token,
    email:     inv.email,
    role:      inv.role,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <BrukereClient
      members={members}
      organizationId={organizationId}
      orgType={org?.type ?? "COMPANY"}
      pendingInvitations={invitations}
    />
  );
}
