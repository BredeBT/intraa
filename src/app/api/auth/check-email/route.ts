import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim() ?? "";

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ available: false, error: "Ugyldig e-postadresse" });
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
