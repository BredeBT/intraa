import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/follow  { followingId, organizationId }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { followingId, organizationId } = (await request.json()) as {
    followingId: string;
    organizationId: string;
  };

  // Verify caller is a member of this org
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  // Can't follow yourself
  if (followingId === session.user.id) {
    return NextResponse.json({ error: "Kan ikke følge deg selv" }, { status: 400 });
  }

  const follow = await db.follow.upsert({
    where: {
      followerId_followingId_organizationId: {
        followerId: session.user.id, followingId, organizationId,
      },
    },
    create: { followerId: session.user.id, followingId, organizationId },
    update: {},
  });

  return NextResponse.json(follow, { status: 201 });
}

// DELETE /api/follow  { followingId, organizationId }
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { followingId, organizationId } = (await request.json()) as {
    followingId: string;
    organizationId: string;
  };

  await db.follow.deleteMany({
    where: { followerId: session.user.id, followingId, organizationId },
  });

  return NextResponse.json({ ok: true });
}
