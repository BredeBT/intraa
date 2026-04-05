import { db } from "@/server/db";

const POINT_VALUES: Record<string, number> = {
  POST:    10,
  MESSAGE:  2,
  COMMENT:  5,
  LOGIN:    1,
};

/**
 * Awards points to a user within an org.
 * Increments Membership.points and inserts a UserActivity row.
 * Safe to call fire-and-forget — errors are swallowed to never block the main action.
 */
export async function addPoints(
  userId: string,
  organizationId: string,
  action: keyof typeof POINT_VALUES,
): Promise<void> {
  const points = POINT_VALUES[action];
  if (!points) return;

  try {
    await db.$transaction([
      db.membership.updateMany({
        where: { userId, organizationId },
        data:  { points: { increment: points } },
      }),
      db.userActivity.create({
        data: { userId, organizationId, action, points },
      }),
    ]);
  } catch {
    // Points are non-critical — never block the main action
  }
}
