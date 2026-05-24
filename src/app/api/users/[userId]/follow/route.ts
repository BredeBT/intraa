import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/** POST /api/users/[userId]/follow — abonner på bruker globalt */
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { userId: followingId } = await params;

  if (followingId === session.user.id) {
    return NextResponse.json({ error: "Kan ikke følge deg selv" }, { status: 400 });
  }

  // Verifiser at brukeren finnes og er public
  const target = await db.user.findUnique({
    where:  { id: followingId },
    select: { id: true, isPublic: true },
  });
  if (!target) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (!target.isPublic) return NextResponse.json({ error: "Profilen er privat" }, { status: 403 });

  await db.userFollow.upsert({
    where:  { followerId_followingId: { followerId: session.user.id, followingId } },
    create: { followerId: session.user.id, followingId },
    update: {},
  });

  return NextResponse.json({ ok: true, following: true });
}

/** DELETE /api/users/[userId]/follow — slutt å følge */
export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { userId: followingId } = await params;

  await db.userFollow.deleteMany({
    where: { followerId: session.user.id, followingId },
  });

  return NextResponse.json({ ok: true, following: false });
}
