import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const users = await db.user.findMany({
    where:  { username: null },
    select: { id: true, name: true },
  });

  console.log(`Backfilling ${users.length} users without username...`);

  for (const user of users) {
    const base = (user.name ?? "user")
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 18) || "user";

    let username = base;
    let i = 2;
    while (await db.user.findUnique({ where: { username } })) {
      username = `${base}${i++}`;
    }

    await db.user.update({ where: { id: user.id }, data: { username } });
    console.log(`  ${user.name ?? user.id} → @${username}`);
  }

  console.log("Done.");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
