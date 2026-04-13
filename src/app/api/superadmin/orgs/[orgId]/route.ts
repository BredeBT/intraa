import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** PATCH /api/superadmin/orgs/[orgId] — update name, slug, plan */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { orgId } = await params;
  const body = await request.json() as { name?: string; slug?: string; plan?: string; description?: string | null; joinType?: string; visibility?: string; suspended?: boolean };

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  if (body.slug && body.slug !== org.slug) {
    const existing = await db.organization.findUnique({ where: { slug: body.slug } });
    if (existing) return NextResponse.json({ error: `Slug «${body.slug}» er allerede i bruk` }, { status: 409 });
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data:  {
      ...(body.name     !== undefined ? { name: body.name!.trim() }      : {}),
      ...(body.slug     !== undefined ? { slug: body.slug }              : {}),
      ...(body.plan     !== undefined ? { plan: body.plan as never }     : {}),
      ...("description" in body      ? { description: body.description } : {}),
      ...(body.joinType   !== undefined ? { joinType:   body.joinType }   : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/superadmin/orgs/[orgId] — permanently delete org */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { orgId } = await params;
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  await db.organization.delete({ where: { id: orgId } });
  return NextResponse.json({ ok: true });
}
