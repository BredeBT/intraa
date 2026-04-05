import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

export async function requireAdmin(organizationId?: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // If no orgId passed, find the user's active org from cookie/first membership
  let orgId = organizationId;
  if (!orgId) {
    const { getUserOrg } = await import("@/server/getUserOrg");
    const ctx = await getUserOrg();
    if (!ctx) redirect("/feed");
    orgId = ctx.organizationId;
  }

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  if (!membership || !(ADMIN_ROLES as readonly string[]).includes(membership.role)) {
    redirect("/feed");
  }

  return { userId: session.user.id, organizationId: orgId, role: membership.role, points: membership.points };
}
