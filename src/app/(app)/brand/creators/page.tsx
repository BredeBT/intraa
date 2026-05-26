import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import CreatorsClient from "./CreatorsClient";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function BrandCreatorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Krev sponsor-profil for å se siden
  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, brandName: true },
  });
  if (!sponsor) redirect("/brand/dashboard");

  // Initial batch — første 30 creators uten filter
  const creators = await db.user.findMany({
    where:  { userType: "CREATOR", isPublic: true },
    select: {
      id:          true,
      name:        true,
      username:    true,
      avatarUrl:   true,
      bio:         true,
      creatorTags: true,
      memberships: {
        where:  { role: "OWNER", organization: { type: "COMMUNITY" } },
        select: { organization: { select: { id: true, name: true, slug: true, _count: { select: { memberships: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take:    30,
  });

  const initial = creators.map((c) => ({
    id:        c.id,
    name:      c.name,
    username:  c.username,
    avatarUrl: c.avatarUrl,
    bio:       c.bio?.replace(/<[^>]+>/g, "").slice(0, 140) ?? null,
    tags:      c.creatorTags,
    communities: c.memberships.map((m) => ({
      id:          m.organization.id,
      name:        m.organization.name,
      slug:        m.organization.slug,
      memberCount: m.organization._count.memberships,
    })),
  }));

  return <CreatorsClient initial={initial} sponsorBrandName={sponsor.brandName} />;
}
