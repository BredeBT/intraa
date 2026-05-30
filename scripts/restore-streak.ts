import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const EMAIL  = "brede_bt@hotmail.com";
const STREAK = 5;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function main() {
  // Yesterday-UTC slik at neste GET /api/user/streak (eller klikker-sync) bumper
  // til STREAK+1 i dag. Hvis vi setter lastStreakDay = today, blir bumpen no-op
  // og brukeren blir værende på STREAK.
  const yesterday = new Date(startOfUtcDay(new Date()).getTime() - 24 * 60 * 60 * 1000);

  const before = await db.user.findUnique({
    where:  { email: EMAIL },
    select: { id: true, dailyStreak: true, longestStreak: true, lastStreakDay: true },
  });
  if (!before) throw new Error(`Fant ikke bruker med email ${EMAIL}`);

  console.log("Før:", before);

  const updated = await db.user.update({
    where: { email: EMAIL },
    data:  {
      dailyStreak:   STREAK,
      longestStreak: Math.max(before.longestStreak, STREAK),
      lastStreakDay: yesterday,
    },
    select: { dailyStreak: true, longestStreak: true, lastStreakDay: true },
  });
  console.log("Etter:", updated);
  console.log("Neste sidelast / klikker-aktivitet bumper til:", STREAK + 1);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
