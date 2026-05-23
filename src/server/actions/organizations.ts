"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";

export async function createOrganization(
  name: string,
  slug: string,
  type: "COMPANY" | "COMMUNITY",
  plan: "FREE" | "PRO" | "ENTERPRISE"
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Ikke innlogget" };
  }

  // Tilgang: superadmin kan alt. CREATOR kan lage sitt eget COMMUNITY på FREE.
  const isSuperAdmin = session.user.isSuperAdmin === true;
  const isCreator    = session.user.userType === "CREATOR";

  if (!isSuperAdmin && !isCreator) {
    return { success: false, error: "Ingen tilgang" };
  }
  if (!isSuperAdmin && (type !== "COMMUNITY" || plan !== "FREE")) {
    return { success: false, error: "Kun community på Free-plan er tilgjengelig" };
  }

  if (!name.trim() || !slug.trim()) {
    return { success: false, error: "Navn og slug er påkrevd" };
  }
  if (name.length > 80 || slug.length > 60) {
    return { success: false, error: "Navn eller slug for langt" };
  }

  const slugClean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const existing = await db.organization.findUnique({ where: { slug: slugClean } });
  if (existing) {
    return { success: false, error: `Slug «${slugClean}» er allerede i bruk` };
  }

  // Creator self-serve: man eier kun ett community av gangen (forhindrer spam)
  if (!isSuperAdmin) {
    const alreadyOwns = await db.membership.findFirst({
      where:  { userId: session.user.id, role: "OWNER", organization: { type: "COMMUNITY" } },
      select: { id: true },
    });
    if (alreadyOwns) {
      return { success: false, error: "Du eier allerede et community" };
    }
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

  await seedDefaultFeatures(org.id, type);

  revalidatePath("/superadmin");
  revalidatePath("/home");
  return { success: true, id: org.id, slug: org.slug };
}
