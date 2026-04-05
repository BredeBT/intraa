import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

function toInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const ACCENT_COLORS = [
  "#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
];

function orgColor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const memberships = await db.membership.findMany({
    where:   { userId: session.user.id },
    include: { organization: true },
    orderBy: { organization: { createdAt: "asc" } },
  });

  const orgs = memberships.map((m) => {
    const o = m.organization;
    return {
      id:          o.id,
      slug:        o.slug,
      name:        o.name,
      initials:    toInitials(o.name),
      type:        o.type,
      plan:        o.plan,
      accentColor: orgColor(o.id),
    };
  });

  return NextResponse.json(orgs);
}
