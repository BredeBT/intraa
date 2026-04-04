import { PrismaClient } from "@prisma/client";

function isPlaceholder(url: string) {
  return url.includes("placeholder") || url.includes("localhost");
}

function createClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url || isPlaceholder(url)) return null;
  return new PrismaClient({ log: ["error"] });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

export const db: PrismaClient | null =
  "prisma" in globalForPrisma ? globalForPrisma.prisma : createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
