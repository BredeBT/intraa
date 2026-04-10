import { notFound } from "next/navigation";
import { db } from "@/server/db";
import MedlemmerClient from "./MedlemmerClient";

export default async function MedlemmerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where:   { id: orgId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, username: true } } },
        orderBy: { role: "asc" },
      },
    },
  });
  if (!org) notFound();

  const members = org.memberships.map((m) => ({
    membershipId:   m.id,
    userId:         m.userId,
    name:           m.user.name ?? m.user.email,
    email:          m.user.email,
    role:           m.role,
    username:       m.username,
    globalUsername: m.user.username,
  }));

  return <MedlemmerClient members={members} organizationId={orgId} orgName={org.name} />;
}
