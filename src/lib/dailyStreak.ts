import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";

/**
 * Bonus-tiers: når brukeren når disse streak-tallene, deler vi ut coins
 * og lager en STREAK_BUMP-notifikasjon. Coins gis til ALLE brukerens
 * org-medlemskap (coins er per-org og kun brukbare i den orgs shop).
 */
const STREAK_BONUSES: { day: number; coins: number; label: string }[] = [
  { day:   3, coins:   10, label: "3 dager på rad! 🔥" },
  { day:   7, coins:   50, label: "1-ukes streak! 🔥🔥" },
  { day:  14, coins:  100, label: "2-ukers streak! 🔥🔥🔥" },
  { day:  30, coins:  500, label: "30-dagers streak — du er på! 💯" },
  { day: 100, coins: 2500, label: "100-dagers streak — vanvittig 🏆" },
];

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Bumpes første gang brukeren er aktiv hver dag (gjennom updateLastActive).
 * - Samme dag som forrige bump → no-op
 * - I går → +1
 * - Eldre / aldri → reset til 1
 *
 * Returnerer ny streak. Trygt å fire-and-forget (kaster ikke).
 */
export async function bumpStreak(userId: string): Promise<number> {
  try {
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { dailyStreak: true, longestStreak: true, lastStreakDay: true },
    });
    if (!user) return 0;

    const today     = startOfUtcDay(new Date());
    const lastDay   = user.lastStreakDay ? startOfUtcDay(user.lastStreakDay) : null;
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Allerede bumpet i dag → ikke gjør noe
    if (lastDay && lastDay.getTime() === today.getTime()) {
      return user.dailyStreak;
    }

    const newStreak = lastDay && lastDay.getTime() === yesterday.getTime()
      ? user.dailyStreak + 1
      : 1;

    const longest = Math.max(user.longestStreak, newStreak);

    await db.user.update({
      where: { id: userId },
      data:  { dailyStreak: newStreak, longestStreak: longest, lastStreakDay: today },
    });

    // Tier-bonus?
    const tier = STREAK_BONUSES.find((b) => b.day === newStreak);
    if (tier) {
      void awardTierBonus(userId, tier);
    }

    return newStreak;
  } catch {
    return 0;
  }
}

async function awardTierBonus(
  userId: string,
  tier:   { day: number; coins: number; label: string },
): Promise<void> {
  try {
    // Coins til alle brukerens orgs (de er per-org, så ikke gratisluft)
    const memberships = await db.membership.findMany({
      where:  { userId },
      select: { organizationId: true },
    });

    await Promise.all(
      memberships.map((m) =>
        awardCoins({
          userId,
          organizationId: m.organizationId,
          amount:         tier.coins,
          reason:         "admin_grant",   // bypasser daily cap
          description:    `Streak-bonus (${tier.day} dager)`,
        }),
      ),
    );

    // Én notifikasjon — uten organizationId (det er en global event)
    await db.notification.create({
      data: {
        userId,
        type:     "STREAK_BUMP",
        title:    tier.label,
        body:     `+${tier.coins} coins i hvert av dine communities. Fortsett i morgen!`,
        href:     "/home",
        priority: 1,
      },
    });
  } catch {
    // Stille — bonus er nice-to-have
  }
}
