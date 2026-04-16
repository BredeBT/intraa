import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import ChessGame from "./ChessGame";

export default async function ChessGamePage({
  params,
}: {
  params: Promise<{ orgSlug: string; gameId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logg-inn");

  const { gameId, orgSlug } = await params;

  const game = await db.chessGame.findUnique({
    where:   { id: gameId },
    include: {
      white: { select: { id: true, name: true, avatarUrl: true } },
      black: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!game) redirect(`/${orgSlug}/spill/sjakk`);

  const isPlayer = game.whiteId === session.user.id || game.blackId === session.user.id;

  // Fetch both players' chess profiles (ratings)
  const [whiteProfile, blackProfile] = await Promise.all([
    db.chessProfile.upsert({
      where:  { userId_orgId: { userId: game.whiteId, orgId: game.orgId } },
      create: { userId: game.whiteId, orgId: game.orgId },
      update: {},
    }),
    db.chessProfile.upsert({
      where:  { userId_orgId: { userId: game.blackId, orgId: game.orgId } },
      create: { userId: game.blackId, orgId: game.orgId },
      update: {},
    }),
  ]);

  return (
    <ChessGame
      game={{
        id:      game.id,
        fen:     game.fen,
        status:  game.status,
        moves:   game.moves as string[],
        white:   game.white,
        black:   game.black,
        orgSlug,
      }}
      userId={session.user.id}
      isPlayer={isPlayer}
      whiteRating={whiteProfile.rating}
      blackRating={blackProfile.rating}
    />
  );
}
