import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orgId, name, slug, type } = (await request.json()) as {
    orgId: string;
    name:  string;
    slug:  string;
    type:  string;
  };

  // Verify caller is OWNER or ADMIN of this org
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  console.log("[admin/org] Lagrer:", { orgId, name, slug });
  try {
    const updated = await db.organization.update({
      where: { id: orgId },
      data:  { name: name.trim(), slug: slug.trim(), type: type as "COMPANY" | "COMMUNITY" },
    });
    console.log("[admin/org] Lagret OK:", { id: updated.id, name: updated.name, slug: updated.slug });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 400 });
  }
}
