import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  // Find all users whose username starts with @
  const badUsers = await db.user.findMany({
    where:  { username: { startsWith: "@" } },
    select: { id: true, name: true, username: true, email: true },
  });

  console.log(`Brukere med @ i username: ${badUsers.length}`);

  for (const user of badUsers) {
    const fixed = user.username!.replace(/^@+/, "");
    // Check uniqueness
    const existing = await db.user.findFirst({ where: { username: fixed, id: { not: user.id } } });
    const finalUsername = existing ? `${fixed}2` : fixed;

    await db.user.update({ where: { id: user.id }, data: { username: finalUsername } });
    console.log(`  ${user.email}: "${user.username}" → "${finalUsername}"`);
  }

  console.log("Ferdig.");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
