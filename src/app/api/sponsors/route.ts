import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/sponsors — list all sponsor profiles for tagging-picker.
 * In v1 enhver creator kan tagge enhver registrert sponsor — later vi
 * legge til "connected sponsors only" hvis ønskelig.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const sponsors = await db.sponsorProfile.findMany({
    orderBy: { brandName: "asc" },
    select:  {
      id:        true,
      slug:      true,
      brandName: true,
      logoUrl:   true,
      website:   true,
    },
    take: 200,
  });

  return NextResponse.json({ sponsors });
}
