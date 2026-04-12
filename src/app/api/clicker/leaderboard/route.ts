import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { db } = await import("@/server/db");

  const top = await db.clickerProfile.findMany({
    where:   { organizationId: orgId, coins: { gt: 0 } },
    orderBy: { coins: "desc" },
    take:    5,
    select: {
      coins:        true,
      totalClicks:  true,
      prestigeWorld: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(top);
}
