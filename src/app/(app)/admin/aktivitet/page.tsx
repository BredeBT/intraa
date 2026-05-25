import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import AktivitetClient from "./AktivitetClient";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function AktivitetPage() {
  const { organizationId } = await requireAdmin();

  // Initial batch (siste 30 dager, alle handlinger)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const logs = await db.auditLog.findMany({
    where:   { organizationId, createdAt: { gte: since } },
    include: { actor: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    take:    51,
  });

  const hasMore = logs.length > 50;
  const items   = hasMore ? logs.slice(0, 50) : logs;

  const initial = items.map((l) => ({
    id:         l.id,
    action:     l.action,
    targetType: l.targetType,
    targetId:   l.targetId,
    metadata:   l.metadata as Record<string, unknown> | null,
    ipAddress:  l.ipAddress,
    createdAt:  l.createdAt.toISOString(),
    actor:      l.actor,
  }));

  return (
    <AktivitetClient
      initial={initial}
      initialNextCursor={hasMore ? items[items.length - 1].id : null}
    />
  );
}
