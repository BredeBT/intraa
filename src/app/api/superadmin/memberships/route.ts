import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
    if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

    const body = (await request.json()) as {
      userId:         string;
      organizationId: string;
      role:           string;
      username?:      string;
    };
    const { userId, organizationId, role, username } = body;

    console.log("[superadmin/memberships] POST mottatt:", { userId, organizationId, role, username });

    if (!userId || !organizationId || !role) {
      return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
    }

    // Validate username format if provided
    if (username) {
      if (!/^[a-zA-Z0-9_]{1,30}$/.test(username)) {
        return NextResponse.json({ error: "Ugyldig brukernavn — kun bokstaver, tall og _ (maks 30 tegn)" }, { status: 400 });
      }
      const taken = await db.membership.findFirst({
        where: { organizationId, username },
      });
      if (taken) {
        return NextResponse.json({ error: "Brukernavnet er allerede tatt" }, { status: 400 });
      }
    }

    const existing = await db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Brukeren er allerede medlem" }, { status: 400 });
    }

    const membership = await db.membership.create({
      data: {
        userId,
        organizationId,
        role:     role as "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER",
        username: username || null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("[superadmin/memberships] Feil:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
