import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import InvitasjonsPanel from "./InvitasjonsPanel";

export default async function InvitasjonsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  if (!db) throw new Error("Database ikke tilgjengelig");

  const [orgs, invitations] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: { select: { name: true } }, invitedBy: { select: { name: true } } },
    }),
  ]);

  return <InvitasjonsPanel orgs={orgs} initialInvitations={invitations} />;
}
