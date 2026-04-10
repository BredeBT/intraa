import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { validateUsername } from "@/lib/bannedUsernames";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin)
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json() as { username?: string };
  const { username } = body;

  if (username === undefined)
    return NextResponse.json({ error: "username er påkrevd" }, { status: 400 });

  const validation = validateUsername(username);
  if (!validation.valid)
    return NextResponse.json({ error: validation.error }, { status: 400 });

  // Check uniqueness
  const existing = await db.user.findFirst({
    where: { username, id: { not: userId } },
    select: { id: true },
  });
  if (existing)
    return NextResponse.json({ error: "Brukernavnet er allerede tatt" }, { status: 409 });

  const updated = await db.user.update({
    where:  { id: userId },
    data:   { username },
    select: { id: true, username: true },
  });

  return NextResponse.json({ user: updated });
}
