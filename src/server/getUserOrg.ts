import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export interface UserOrg {
  userId:         string;
  organizationId: string;
  orgName:        string;
  orgSlug:        string;
  orgPlan:        string;
  orgType:        string;
}

/**
 * Reads the session + `selected_org` cookie, finds the matching membership,
 * and returns org + userId. Falls back to the user's first org if the cookie
 * points to an org they're not a member of. Redirects to /login if unauthenticated.
 */
export async function getUserOrg(): Promise<UserOrg | null> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_org")?.value;

  let membership = null;

  if (selectedSlug) {
    membership = await db.membership.findFirst({
      where:   { userId: session.user.id, organization: { slug: selectedSlug } },
      include: { organization: true },
    });
  }

  // Fallback to first org (by creation date)
  if (!membership) {
    membership = await db.membership.findFirst({
      where:   { userId: session.user.id },
      include: { organization: true },
      orderBy: { organization: { createdAt: "asc" } },
    });
  }

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
