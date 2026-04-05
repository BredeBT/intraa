import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { cookies } from "next/headers";

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

function orgToJson(o: { id: string; slug: string; name: string; type: string; plan: string }) {
  return {
    id:          o.id,
    slug:        o.slug,
    name:        o.name,
    initials:    toInitials(o.name),
    type:        o.type,
    plan:        o.plan,
    accentColor: orgColor(o.id),
  };
}

// GET — returns the user's active org (respects selected_org cookie)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_org")?.value;

  let membership = null;

  if (selectedSlug) {
    membership = await db.membership.findFirst({
      where:   { userId: session.user.id, organization: { slug: selectedSlug } },
      include: { organization: true },
    });
  }

  if (!membership) {
    membership = await db.membership.findFirst({
      where:   { userId: session.user.id },
      include: { organization: true },
      orderBy: { organization: { createdAt: "asc" } },
    });
  }

  if (!membership) {
    return NextResponse.json({ error: "Ingen org" }, { status: 404 });
  }

  return NextResponse.json(orgToJson(membership.organization));
}

// PATCH { slug } — switches the active org and sets the persistent cookie
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { slug } = (await request.json()) as { slug: string };

  const membership = await db.membership.findFirst({
    where:   { userId: session.user.id, organization: { slug } },
    include: { organization: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  const response = NextResponse.json(orgToJson(membership.organization));
  response.cookies.set("selected_org", slug, {
    httpOnly: true,
    path:     "/",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,   // 30 days
  });
  return response;
}
