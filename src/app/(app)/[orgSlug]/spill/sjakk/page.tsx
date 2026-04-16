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

  // Co-members for opponent picker
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

  // Pending invites
  const [receivedInvites, sentInvites] = await Promise.all([
    db.chessInvite.findMany({
      where:   { orgId: org.id, receiverId: session.user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    db.chessInvite.findMany({
      where:   { orgId: org.id, senderId: session.user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { receiver: { select: { id: true, name: true, avatarUrl: true } } },
    }),
  ]);

  // Current user's chess profile (get-or-create via upsert)
  const myProfile = await db.chessProfile.upsert({
    where:  { userId_orgId: { userId: session.user.id, orgId: org.id } },
    create: { userId: session.user.id, orgId: org.id },
    update: {},
  });

  // Top 10 leaderboard for this org
  const leaderboard = await db.chessProfile.findMany({
    where:   { orgId: org.id },
    orderBy: { rating: "desc" },
    take:    10,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return (
    <ChessLobby
      orgId={org.id}
      orgSlug={orgSlug}
      userId={session.user.id}
      members={members.map((m) => m.user)}
      activeGames={myGames}
      receivedInvites={receivedInvites.map((i) => ({ id: i.id, sender: i.sender }))}
      sentInvites={sentInvites.map((i) => ({ id: i.id, receiver: i.receiver }))}
      myProfile={{ rating: myProfile.rating, wins: myProfile.wins, losses: myProfile.losses, draws: myProfile.draws }}
      leaderboard={leaderboard.map((p) => ({
        user:   p.user,
        rating: p.rating,
        wins:   p.wins,
        losses: p.losses,
        draws:  p.draws,
      }))}
    />
  );
}
