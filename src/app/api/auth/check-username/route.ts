import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { validateUsername } from "@/lib/bannedUsernames";

// Simple in-memory rate limit (per IP, max 10/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// GET /api/auth/check-username?username=X
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ available: false, error: "For mange forsøk, vent litt" }, { status: 429 });
  }

  const username = req.nextUrl.searchParams.get("username") ?? "";

  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  const existing = await db.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
