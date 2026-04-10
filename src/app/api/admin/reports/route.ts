import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = await req.json() as {
    reportedUserId: string;
    organizationId: string;
    reason: string;
    description?: string;
  };

  const { reportedUserId, organizationId, reason, description } = body;
  if (!reportedUserId || !organizationId || !reason)
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });

  // Verify caller is member of the org
  const caller = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
    select: { role: true },
  });
  if (!caller || !["OWNER", "ADMIN"].includes(caller.role))
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const report = await db.userReport.create({
    data: {
      reportedUserId,
      reportedById:  session.user.id,
      organizationId,
      reason:        reason as never,
      description:   description?.trim() || null,
    },
  });

  return NextResponse.json({ report });
}
