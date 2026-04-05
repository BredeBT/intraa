"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import type { File } from "@/lib/types";

export async function getFiles(orgId: string): Promise<File[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.file.findMany({
    where:   { orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadFile(
  orgId: string,
  name: string,
  url: string,
  size: number,
): Promise<File> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.file.create({
    data: { orgId, uploaderId: session.user.id, name, url, size },
  });
}
