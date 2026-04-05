import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";

export interface UserOrg {
  userId:         string;
  organizationId: string;
  orgName:        string;
  orgSlug:        string;
  orgPlan:        string;
  orgType:        string;
}

/**
 * Reads the session, finds the user's first (primary) membership,
 * and returns org + userId. Redirects to /login if unauthenticated,
 * or returns null if the user has no memberships yet.
 */
export async function getUserOrg(): Promise<UserOrg | null> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { organization: { createdAt: "asc" } },
  });

  if (!membership) return null;

  return {
    userId:         session.user.id,
    organizationId: membership.organizationId,
    orgName:        membership.organization.name,
    orgSlug:        membership.organization.slug,
    orgPlan:        membership.organization.plan,
    orgType:        membership.organization.type,
  };
}
