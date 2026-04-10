import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// GET /api/groups — list groups the user is in
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const memberships = await db.groupChatMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groups = memberships.map((m) => ({
    id:          m.group.id,
    name:        m.group.name,
    lastMessage: m.group.messages[0]
      ? { content: m.group.messages[0].content, createdAt: m.group.messages[0].createdAt.toISOString() }
      : null,
    lastReadAt:  m.lastReadAt?.toISOString() ?? null,
    members:     m.group.members.map((gm) => ({
      id:       gm.user.id,
      name:     gm.user.name,
      avatarUrl: gm.user.avatarUrl,
    })),
  }));

  return NextResponse.json({ groups });
}

// POST /api/groups — create a group
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await req.json() as { name?: string; memberIds?: string[] };
  const { name, memberIds = [] } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Gruppenavn er påkrevd" }, { status: 400 });

  const group = await db.groupChat.create({
    data: {
      name:      name.trim(),
      createdBy: session.user.id,
      members: {
        create: [
          { userId: session.user.id },
          ...memberIds.filter((id) => id !== session.user.id).map((id) => ({ userId: id })),
        ],
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });

  return NextResponse.json({
    group: {
      id:      group.id,
      name:    group.name,
      members: group.members.map((m) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl })),
    },
  });
}
