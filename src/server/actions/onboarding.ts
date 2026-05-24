"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";

export type OnboardingProgress = {
  // Identifiserer hvilket community vi viser onboarding for (første ownership)
  orgId:   string;
  orgSlug: string;
  steps: {
    createCommunity: boolean;  // alltid true når vi har orgId
    brandTheme:      boolean;  // logo + banner satt på TenantTheme
    firstPost:       boolean;  // ≥1 post i orgen
    invite:          boolean;  // openInviteToken finnes (delbar link generert)
  };
  completed: number;
  total:     number;
};

/**
 * Returns null hvis:
 *   - bruker ikke er CREATOR
 *   - bruker har dismisset onboarding
 *   - bruker ikke eier noe community ennå (da viser vi heller en "Opprett ditt community"-CTA separat)
 *   - alle steg er fullført
 *
 * Hvis bruker er CREATOR uten community, returneres et "tomt" progress-objekt
 * med orgId/orgSlug satt til tom streng — UI bruker det til å vise create-CTA.
 */
export async function getOnboardingProgress(): Promise<OnboardingProgress | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.userType !== "CREATOR") return null;

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { onboardingDismissedAt: true },
  });
  if (user?.onboardingDismissedAt) return null;

  const ownership = await db.membership.findFirst({
    where:   { userId: session.user.id, role: "OWNER", organization: { type: "COMMUNITY" } },
    orderBy: { id: "asc" },
    include: {
      organization: {
        select: {
          id: true, slug: true, openInviteToken: true,
          theme: { select: { logoUrl: true, bannerUrl: true } },
          _count: { select: { posts: true } },
        },
      },
    },
  });

  if (!ownership) {
    return {
      orgId: "", orgSlug: "",
      steps: {
        createCommunity: false,
        brandTheme:      false,
        firstPost:       false,
        invite:          false,
      },
      completed: 0,
      total:     4,
    };
  }

  const org = ownership.organization;
  const steps = {
    createCommunity: true,
    brandTheme:      !!(org.theme?.logoUrl || org.theme?.bannerUrl),
    firstPost:       org._count.posts > 0,
    invite:          !!org.openInviteToken,
  };

  const completed = Object.values(steps).filter(Boolean).length;
  const total     = Object.keys(steps).length;

  if (completed >= total) return null;

  return {
    orgId:   org.id,
    orgSlug: org.slug,
    steps,
    completed,
    total,
  };
}

/**
 * Owner-tilgjengelig: genererer (eller returnerer eksisterende) open-invite-token
 * for et community. Brukt av onboarding-checklisten "Inviter første fans".
 */
export async function ensureOpenInviteToken(orgId: string): Promise<
  | { success: true; token: string }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Ikke innlogget" };

  const membership = await db.membership.findFirst({
    where:  { userId: session.user.id, organizationId: orgId, role: "OWNER" },
    select: { id: true },
  });
  if (!membership) return { success: false, error: "Kun eier kan generere invitasjonslenke" };

  const org = await db.organization.findUnique({
    where: { id: orgId }, select: { openInviteToken: true },
  });
  if (org?.openInviteToken) return { success: true, token: org.openInviteToken };

  const token = randomBytes(24).toString("hex");
  await db.organization.update({ where: { id: orgId }, data: { openInviteToken: token } });

  revalidatePath("/home");
  return { success: true, token };
}

export async function dismissOnboarding(): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await db.user.update({
    where: { id: session.user.id },
    data:  { onboardingDismissedAt: new Date() },
  });

  revalidatePath("/home");
  return { success: true };
}
