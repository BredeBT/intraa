import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import ForesporslerClient from "./ForesporslerClient";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function ForesporslerPage() {
  const { organizationId } = await requireAdmin();

  // Hent første batch (PENDING) på server-side for instant render
  const requests = await db.joinRequest.findMany({
    where:   { organizationId, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true, bio: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    100,
  });

  const initial = requests.map((r) => ({
    id:        r.id,
    status:    r.status,
    message:   r.message,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    user:      r.user,
  }));

  return <ForesporslerClient initial={initial} />;
}
