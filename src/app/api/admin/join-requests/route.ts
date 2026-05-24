import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/join-requests?q=&status=PENDING|APPROVED|REJECTED
 * Liste medlemskaps-forespørsler for admins community.
 */
export async function GET(req: NextRequest) {
  const { organizationId } = await requireAdmin();
  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";

  const requests = await db.joinRequest.findMany({
    where: {
      organizationId,
      ...(status !== "ALL" ? { status } : {}),
      ...(q ? {
        user: {
          OR: [
            { name:     { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { email:    { contains: q, mode: "insensitive" } },
          ],
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true, bio: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    200,
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id:           r.id,
      status:       r.status,
      message:      r.message,
      createdAt:    r.createdAt.toISOString(),
      reviewedAt:   r.reviewedAt?.toISOString() ?? null,
      user:         r.user,
    })),
  });
}
