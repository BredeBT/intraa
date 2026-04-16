import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import ChessLobby from "./ChessLobby";

export default async function SjakkPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logg-inn");

  const { orgSlug } = await params;
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) redirect("/home");

  // Get current user's membership + co-members for opponent picker
  const members = await db.membership.findMany({
    where:  { organizationId: org.id, userId: { not: session.user.id } },
    select: { user: { select: { id: true, name: true, avatarUrl: true } } },
    take:   50,
  });

  // Active games the user is in
  const myGames = await db.chessGame.findMany({
    where: {
      orgId:  org.id,
      status: "active",
      OR: [{ whiteId: session.user.id }, { blackId: session.user.id }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      white: { select: { id: true, name: true, avatarUrl: true } },
      black: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return (
    <ChessLobby
      orgId={org.id}
      orgSlug={orgSlug}
      userId={session.user.id}
      members={members.map((m) => m.user)}
      activeGames={myGames}
    />
  );
}
