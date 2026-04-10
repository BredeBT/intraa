import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const supportOrg = await db.organization.upsert({
    where:  { slug: "intraa-support" },
    create: {
      name: "Intraa Support",
      slug: "intraa-support",
      type: "COMPANY",
      plan: "ENTERPRISE",
    },
    update: {},
  });

  console.log("Support org:", supportOrg.id, supportOrg.slug);

  const superadmin = await db.user.findUnique({ where: { email: "brede@intraa.net" } });
  if (!superadmin) {
    console.error("Superadmin brede@intraa.net ikke funnet. Kjør seeding etter at brukeren er opprettet.");
    return;
  }

  const membership = await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId:         superadmin.id,
        organizationId: supportOrg.id,
      },
    },
    create: {
      userId:         superadmin.id,
      organizationId: supportOrg.id,
      role:           "OWNER",
    },
    update: {},
  });

  console.log("Membership:", membership.id, membership.role);
  console.log("Done! Intraa support org er klar.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
