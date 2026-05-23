import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  // Hindre email-enumeration via brute-force iterasjon
  const limited = rateLimit(req, { key: "check-email", max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim() ?? "";

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ available: false, error: "Ugyldig e-postadresse" });
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
