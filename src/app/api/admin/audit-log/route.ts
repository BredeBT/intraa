import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-log?action=&actor=&days=&cursor=
 * Listing av audit-log for admin's organisasjon.
 * Bare OWNER/ADMIN kan se loggen (filtrert via requireAdmin).
 */
export async function GET(req: NextRequest) {
  const { organizationId } = await requireAdmin();
  const sp = req.nextUrl.searchParams;

  const action  = sp.get("action") ?? undefined;
  const actorId = sp.get("actor")  ?? undefined;
  const days    = parseInt(sp.get("days") ?? "30", 10);
  const cursor  = sp.get("cursor") ?? undefined;
  const take    = 50;

  const since = new Date(Date.now() - Math.min(Math.max(days, 1), 365) * 24 * 60 * 60 * 1000);

  const logs = await db.auditLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: since },
      ...(action  ? { action }  : {}),
      ...(actorId ? { actorId } : {}),
    },
    include: {
      actor: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore   = logs.length > take;
  const items     = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    items: items.map((l) => ({
      id:         l.id,
      action:     l.action,
      targetType: l.targetType,
      targetId:   l.targetId,
      metadata:   l.metadata,
      ipAddress:  l.ipAddress,
      createdAt:  l.createdAt.toISOString(),
      actor:      l.actor,
    })),
    nextCursor,
  });
}
