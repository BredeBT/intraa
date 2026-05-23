import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/streak — current daily streak for header-badge.
 *
 * Returns: { streak, longestStreak, lastStreakDay, nextTier }
 */
const TIERS = [3, 7, 14, 30, 100];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ streak: 0, longestStreak: 0 });

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { dailyStreak: true, longestStreak: true, lastStreakDay: true },
  });
  if (!user) return NextResponse.json({ streak: 0, longestStreak: 0 });

  const nextTier = TIERS.find((t) => t > user.dailyStreak) ?? null;

  return NextResponse.json({
    streak:        user.dailyStreak,
    longestStreak: user.longestStreak,
    lastStreakDay: user.lastStreakDay?.toISOString() ?? null,
    nextTier,
  }, { headers: { "Cache-Control": "private, max-age=30" } });
}
