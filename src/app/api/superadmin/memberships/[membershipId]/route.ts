import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type Params = { params: Promise<{ membershipId: string }> };

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  return user?.isSuperAdmin ? session.user.id : null;
}

/** PATCH /api/superadmin/memberships/[membershipId] — change role or username */
export async function PATCH(request: Request, { params }: Params) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const { membershipId } = await params;
  const body = (await request.json()) as { role?: string; username?: string };

  const membership = await db.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const update: { role?: "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER"; username?: string | null } = {};

  if (body.role !== undefined) {
    const VALID = ["OWNER", "ADMIN", "MODERATOR", "VIP", "MEMBER"] as const;
    if (!VALID.includes(body.role as typeof VALID[number])) {
      return NextResponse.json({ error: "Ugyldig rolle" }, { status: 400 });
    }
    update.role = body.role as typeof update.role;
  }

  if (body.username !== undefined) {
    const u = body.username.trim();
    if (u && !/^[a-zA-Z0-9_]{1,30}$/.test(u)) {
      return NextResponse.json({ error: "Ugyldig brukernavn — kun bokstaver, tall og _" }, { status: 400 });
    }
    if (u) {
      const taken = await db.membership.findFirst({
        where: { organizationId: membership.organizationId, username: u, NOT: { id: membershipId } },
      });
      if (taken) return NextResponse.json({ error: "Brukernavnet er allerede tatt" }, { status: 400 });
    }
    update.username = u || null;
  }

  const updated = await db.membership.update({ where: { id: membershipId }, data: update });
  return NextResponse.json({ membership: updated });
}

/** DELETE /api/superadmin/memberships/[membershipId] — remove member */
export async function DELETE(_req: Request, { params }: Params) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const { membershipId } = await params;

  const membership = await db.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Guard: must keep at least one OWNER
  if (membership.role === "OWNER") {
    const ownerCount = await db.membership.count({
      where: { organizationId: membership.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Orgen må ha minst én eier" }, { status: 400 });
    }
  }

  await db.membership.delete({ where: { id: membershipId } });
  return NextResponse.json({ success: true });
}
