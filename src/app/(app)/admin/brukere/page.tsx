import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import BrukereClient from "./BrukereClient";

export default async function BrukerePage() {
  const { organizationId, userId } = await requireAdmin();

  const memberships = await db.membership.findMany({
    where:   { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const members = memberships.map((m) => ({
    userId: m.userId,
    name:   m.user.name ?? "Ukjent",
    email:  m.user.email,
    role:   m.role,
    isMe:   m.userId === userId,
  }));

  return <BrukereClient members={members} organizationId={organizationId} />;
}
