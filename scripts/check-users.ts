import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const allUsers = await db.user.findMany({ select: { id: true, name: true, username: true, email: true } });
  console.log("Alle brukere i DB:");
  for (const u of allUsers) {
    console.log(`  ${u.email} | name="${u.name}" | username="${u.username}"`);
  }

  const without = allUsers.filter((u) => !u.username);
  console.log(`\nBrukere uten username: ${without.length}`);

  for (const user of without) {
    let base = (user.name ?? "user").replace(/\s+/g, "").replace(/[^a-zA-Z0-9_]/g, "");
    if (!base) base = "user";
    let username = base;
    let i = 2;
    while (await db.user.findUnique({ where: { username } })) { username = `${base}${i++}`; }
    await db.user.update({ where: { id: user.id }, data: { username } });
    console.log(`Satt username: ${user.name} → ${username}`);
  }

  console.log("Ferdig.");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
