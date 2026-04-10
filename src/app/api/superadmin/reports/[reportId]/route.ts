import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { reportId } = await params;
  const body = await req.json() as { status?: string; reviewNote?: string };

  const updated = await db.userReport.update({
    where: { id: reportId },
    data: {
      ...(body.status     ? { status: body.status as never } : {}),
      ...(body.reviewNote !== undefined ? { reviewNote: body.reviewNote } : {}),
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ report: updated });
}
