"use server";

import { db } from "@/server/db";
import type { File } from "@/lib/types";

const MOCK_FILES: File[] = [
  { id: "mock-f1", name: "Onboarding-guide.pdf", url: "#", size: 2516582, createdAt: new Date("2026-03-12"), orgId: "mock-org", uploaderId: "mock-user-1" },
  { id: "mock-f2", name: "HMS-håndbok.pdf", url: "#", size: 1153434, createdAt: new Date("2026-01-05"), orgId: "mock-org", uploaderId: "mock-user-1" },
  { id: "mock-f3", name: "Ansettelseskontrakt-mal.docx", url: "#", size: 348160, createdAt: new Date("2026-02-20"), orgId: "mock-org", uploaderId: "mock-user-2" },
  { id: "mock-f4", name: "Feriepenger-oversikt.xlsx", url: "#", size: 90112, createdAt: new Date("2026-03-01"), orgId: "mock-org", uploaderId: "mock-user-2" },
  { id: "mock-f5", name: "Designsystem-v2.fig", url: "#", size: 15414886, createdAt: new Date("2026-03-28"), orgId: "mock-org", uploaderId: "mock-user-3" },
  { id: "mock-f6", name: "Logoer.zip", url: "#", size: 5452595, createdAt: new Date("2025-11-10"), orgId: "mock-org", uploaderId: "mock-user-3" },
  { id: "mock-f7", name: "Nettverkskart.pdf", url: "#", size: 778240, createdAt: new Date("2026-02-15"), orgId: "mock-org", uploaderId: "mock-user-3" },
  { id: "mock-f8", name: "Passordpolicy.pdf", url: "#", size: 215040, createdAt: new Date("2026-01-03"), orgId: "mock-org", uploaderId: "mock-user-3" },
];

export async function getFiles(orgId: string): Promise<File[]> {
  if (!db) return MOCK_FILES;
  try {
    return await db.file.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return MOCK_FILES;
  }
}

export async function uploadFile(
  orgId: string,
  uploaderId: string,
  name: string,
  url: string,
  size: number
): Promise<File> {
  if (!db) throw new Error("Database ikke tilgjengelig");
  return db.file.create({
    data: { orgId, uploaderId, name, url, size },
  });
}
