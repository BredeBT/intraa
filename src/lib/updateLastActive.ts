import { db } from "@/server/db";

// In-memory throttle — avoids hitting the DB on every request per user.
// Good enough for single-process; Vercel may spin up multiple instances,
// but slight over-updating is harmless.
const _cache = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export async function updateLastActive(userId: string): Promise<void> {
  const now  = Date.now();
  const last = _cache.get(userId) ?? 0;
  if (now - last < THROTTLE_MS) return;
  _cache.set(userId, now);
  try {
    await db.user.update({ where: { id: userId }, data: { lastActive: new Date() } });
  } catch {
    // Non-critical — don't surface errors to callers
  }
}
