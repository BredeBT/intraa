import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/groups/[id]/members — add a member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id: groupId } = await params;
  const body = await req.json() as { userId?: string };
  const { userId } = body;

  if (!userId) return NextResponse.json({ error: "userId er påkrevd" }, { status: 400 });

  // Check requester is a member
  const membership = await db.groupChatMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  await db.groupChatMember.upsert({
    where:  { groupId_userId: { groupId, userId } },
    create: { groupId, userId },
    update: {},
  });

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, avatarUrl: true },
  });

  return NextResponse.json({ member: user });
}
