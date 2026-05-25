import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { audit, AuditActions } from "@/lib/audit";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orgId, name, slug, description, joinType } = (await request.json()) as {
    orgId:        string;
    name:         string;
    slug:         string;
    description?: string | null;
    joinType?:    string;
  };

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  // Length-checks før vi når DB
  if (name.length > 80 || slug.length > 60 || (description && description.length > 500)) {
    return NextResponse.json({ error: "Felt for langt" }, { status: 400 });
  }

  // joinType-validering
  const VALID_JOIN_TYPES = ["OPEN", "CLOSED", "PRIVATE"];
  if (joinType !== undefined && !VALID_JOIN_TYPES.includes(joinType)) {
    return NextResponse.json({ error: "Ugyldig joinType" }, { status: 400 });
  }

  // Hent gammel verdi før update så audit-log kan registrere endringen
  const before = await db.organization.findUnique({
    where:  { id: orgId },
    select: { name: true, slug: true, joinType: true },
  });

  try {
    const updated = await db.organization.update({
      where: { id: orgId },
      data:  {
        name:        name.trim(),
        slug:        slug.trim(),
        description: description === undefined ? undefined : (description?.trim() || null),
        ...(joinType !== undefined ? { joinType } : {}),
      },
    });

    // Spesiell audit-entry for joinType-endring siden den endrer hvem som kommer inn
    if (joinType !== undefined && before && before.joinType !== joinType) {
      void audit({
        actorId:        session.user.id,
        organizationId: orgId,
        action:         AuditActions.ORG_JOIN_TYPE,
        targetType:     "organization",
        targetId:       orgId,
        metadata:       { from: before.joinType, to: joinType },
      });
    }

    void audit({
      actorId:        session.user.id,
      organizationId: orgId,
      action:         AuditActions.ORG_UPDATE,
      targetType:     "organization",
      targetId:       orgId,
      metadata:       { changedSlug: before?.slug !== slug.trim() },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 400 });
  }
}
