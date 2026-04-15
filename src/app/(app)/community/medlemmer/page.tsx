import { redirect } from "next/navigation";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { auth } from "@/auth";
import MedlemmerClient from "./MedlemmerClient";
import { checkFeature } from "@/server/checkFeature";

export default async function CommunityMedlemmerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await checkFeature("community_members");

  const ctx = await getUserOrg();
  if (!ctx) redirect("/login");

  const [memberships, myFollows] = await Promise.all([
    db.membership.findMany({
      where:   { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { points: "desc" },
    }),
    db.follow.findMany({
      where:  { followerId: ctx.userId, organizationId: ctx.organizationId },
      select: { followingId: true },
    }),
  ]);
  const followingSet = new Set(myFollows.map((f) => f.followingId));

  const members = memberships.map((m) => ({
    id:         m.userId,
    name:       m.user.name ?? "Ukjent",
    role:       m.role,
    points:     m.points,
    isFollowed: followingSet.has(m.userId),
    isMe:       m.userId === ctx.userId,
  }));

  return (
    <MedlemmerClient
      initialMembers={members}
      organizationId={ctx.organizationId}
    />
  );
}
