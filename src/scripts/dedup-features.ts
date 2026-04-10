import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const all = await db.organizationFeature.findMany({ orderBy: { id: "asc" } });

  const seen    = new Map<string, string>(); // "orgId:feature" → kept id
  const toDelete: string[] = [];

  for (const row of all) {
    const key = `${row.organizationId}:${row.feature}`;
    if (seen.has(key)) {
      toDelete.push(row.id);
    } else {
      seen.set(key, row.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("Ingen duplikater funnet.");
  } else {
    await db.organizationFeature.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Slettet ${toDelete.length} duplikate rader.`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
