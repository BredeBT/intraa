import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardCoins } from "@/lib/awardCoins";

const ALLOWED_GAMES = new Set(["2048", "wordle"]);
const ALLOWED_REASONS: Record<string, string[]> = {
  "2048":   ["game_2048", "game_2048_bonus"],
  "wordle": ["wordle"],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, game, reason } = await req.json() as {
    orgId:  string;
    game:   string;
    reason: string;
  };

  if (!orgId || !game || !reason) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!ALLOWED_GAMES.has(game)) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  if (!ALLOWED_REASONS[game]?.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });

  const awarded = await awardCoins({
    userId:         session.user.id,
    organizationId: orgId,
    amount:         0, // server uses cap.coins for capped reasons
    reason,
    description: `${game} — ${reason}`,
  });

  return NextResponse.json({ awarded });
}
