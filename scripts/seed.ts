import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter, log: ["error"] });

  console.log("🌱 Seeding database...");

  // Organisation
  const org = await db.organization.upsert({
    where: { slug: "intraa-demo" },
    update: {},
    create: { name: "Intraa Demo", slug: "intraa-demo", type: "COMPANY", plan: "PRO" },
  });
  console.log(`✓ Organisation: ${org.name}`);

  // Users
  const hash123   = await bcrypt.hash("passord123", 12);
  const hashBrede = await bcrypt.hash("passord", 12);

  const user = await db.user.upsert({
    where: { email: "anders@intraa.net" },
    update: { password: hash123 },
    create: { email: "anders@intraa.net", name: "Anders Sørensen", password: hash123, isSuperAdmin: true },
  });
  console.log(`✓ User: ${user.name}`);

  const superadmin = await db.user.upsert({
    where: { email: "brede_bt@hotmail.com" },
    update: { password: hashBrede, username: "@Brede", isSuperAdmin: true },
    create: {
      email:       "brede_bt@hotmail.com",
      name:        "Brede",
      username:    "@Brede",
      password:    hashBrede,
      isSuperAdmin: true,
    },
  });
  console.log(`✓ Superadmin: ${superadmin.name} (${superadmin.username})`);

  // Membership
  await db.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });
  console.log(`✓ Membership: ${user.name} → ${org.name} (OWNER)`);

  // Channels
  for (const name of ["general", "random", "it"]) {
    await db.channel.upsert({
      where: { orgId_name: { orgId: org.id, name } },
      update: {},
      create: { name, orgId: org.id, type: "TEXT" },
    });
    console.log(`✓ Channel: #${name}`);
  }

  // Posts
  const posts = [
    { content: "Velkommen til Intraa Demo! 🎉 Dette er feeden der du kan dele oppdateringer og nyheter med teamet.", },
    { content: "Vi har nettopp lansert ny funksjonalitet for tickets. Alle IT- og HR-saker kan nå håndteres direkte i appen. Gi oss tilbakemelding!", },
    { content: "Husk ukentlig standup i morgen kl 09:00. Agenda: sprint-gjennomgang, planlegging av neste uke, og AOB.", },
  ];

  for (const p of posts) {
    await db.post.create({
      data: { content: p.content, orgId: org.id, authorId: user.id },
    });
    console.log(`✓ Post: "${p.content.slice(0, 50)}..."`);
  }

  console.log("\n✅ Seed completed successfully!");
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
