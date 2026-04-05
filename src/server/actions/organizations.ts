"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function createOrganization(
  name: string,
  slug: string,
  type: "COMPANY" | "COMMUNITY",
  plan: "FREE" | "PRO" | "ENTERPRISE"
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) {
    return { success: false, error: "Ingen tilgang" };
  }

  if (!name.trim() || !slug.trim()) {
    return { success: false, error: "Navn og slug er påkrevd" };
  }

  const slugClean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const existing = await db.organization.findUnique({ where: { slug: slugClean } });
  if (existing) {
    return { success: false, error: `Slug «${slugClean}» er allerede i bruk` };
  }

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      slug: slugClean,
      type,
      plan,
      memberships: {
        create: {
          userId: session.user.id,
          role:   "OWNER",
        },
      },
      channels: {
        create: [
          { name: "general",       type: "TEXT" },
          { name: "random",        type: "TEXT" },
          { name: "announcements", type: "TEXT" },
        ],
      },
    },
  });

  revalidatePath("/superadmin");
  return { success: true, id: org.id };
}
