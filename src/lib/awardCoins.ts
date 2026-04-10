import { db } from "@/server/db";

interface AwardCoinsOptions {
  userId:         string;
  organizationId: string;
  amount:         number; // used directly if reason is uncapped (prestige/fanpass_bonus), otherwise from DAILY_CAPS
  reason:         string;
  description:    string;
}

const DAILY_CAPS: Record<string, { coins: number; maxPerDay: number }> = {
  login:            { coins: 5,    maxPerDay: 1    },
  post:             { coins: 10,   maxPerDay: 2    },
  comment:          { coins: 3,    maxPerDay: 3    },
  chat:             { coins: 0,    maxPerDay: 0    }, // ingen coins for chat
  stream:           { coins: 20,   maxPerDay: 1    }, // 30 min sammenhengende
  clicker:          { coins: 1,    maxPerDay: 20   }, // maks 20 coins fra klikking
  prestige:         { coins: 9999, maxPerDay: 999  }, // uncapped — prestige sets its own amount
  fanpass_bonus:    { coins: 50,   maxPerDay: 1    },
};

/**
 * Awards coins to a user within an org, respecting daily caps.
 * Fanpass gives 1.5x multiplier (amount from DAILY_CAPS, not the `amount` param).
 * Safe to call fire-and-forget — errors are swallowed to never block the main action.
 */
// Reasons that bypass daily cap and use the `amount` param directly
const UNCAPPED_REASONS = new Set(["prestige", "fanpass_bonus", "admin_grant"]);

export async function awardCoins({
  userId,
  organizationId,
  amount,
  reason,
  description,
}: AwardCoinsOptions): Promise<number> {
  try {
    // Uncapped reasons: award directly without cap check
    if (UNCAPPED_REASONS.has(reason)) {
      await Promise.all([
        db.membership.updateMany({
          where: { userId, organizationId },
          data:  { points: { increment: amount } },
        }),
        db.coinTransaction.create({
          data: { userId, organizationId, amount, reason, description },
        }),
      ]);
      return amount;
    }

    const cap = DAILY_CAPS[reason];
    if (!cap || cap.coins === 0 || cap.maxPerDay === 0) return 0;

    // Check daily cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await db.coinTransaction.count({
      where: { userId, organizationId, reason, createdAt: { gte: today } },
    });

    if (todayCount >= cap.maxPerDay) return 0;

    // Check fanpass
    const fanpass = await db.fanPass.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    const hasFanpass      = fanpass?.status === "ACTIVE" && fanpass.endDate > new Date();
    const finalAmount      = hasFanpass ? Math.floor(cap.coins * 1.5) : cap.coins;
    const finalDescription = hasFanpass ? `${description} (1.5x Fanpass)` : description;

    await Promise.all([
      db.membership.updateMany({
        where: { userId, organizationId },
        data:  { points: { increment: finalAmount } },
      }),
      db.coinTransaction.create({
        data: { userId, organizationId, amount: finalAmount, reason, description: finalDescription },
      }),
    ]);

    return finalAmount;
  } catch {
    return 0;
  }
}
