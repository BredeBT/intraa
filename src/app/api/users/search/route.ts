import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export interface UserSearchResult {
  id:          string;
  name:        string | null;
  username:    string | null;
  avatarUrl:   string | null;
  /** null = no relation, "PENDING_SENT" = you sent, "PENDING_RECEIVED" = they sent, "ACCEPTED" = friends */
  friendStatus: "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | null;
  friendshipId: string | null;
}

// GET /api/users/search?q=... — global user search across all tenants
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const [users, friendships] = await Promise.all([
    db.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          {
            OR: [
              { name:     { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true },
      take: 10,
    }),
    db.friendship.findMany({
      where: {
        OR: [
          { senderId:   session.user.id },
          { receiverId: session.user.id },
        ],
      },
      select: { id: true, senderId: true, receiverId: true, status: true },
    }),
  ]);

  const results: UserSearchResult[] = users.map((u) => {
    const f = friendships.find(
      (fs) => fs.senderId === u.id || fs.receiverId === u.id,
    );
    let friendStatus: UserSearchResult["friendStatus"] = null;
    let friendshipId: string | null = null;
    if (f) {
      friendshipId = f.id;
      if (f.status === "ACCEPTED") {
        friendStatus = "ACCEPTED";
      } else if (f.senderId === session.user.id) {
        friendStatus = "PENDING_SENT";
      } else {
        friendStatus = "PENDING_RECEIVED";
      }
    }
    return { ...u, friendStatus, friendshipId };
  });

  return NextResponse.json({ users: results });
}
