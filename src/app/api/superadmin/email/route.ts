import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db }   from "@/server/db";
import { sendMarketingEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** GET /api/superadmin/email — recipient preview stats */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") ?? "all";
  const orgId    = searchParams.get("orgId");

  const where = buildWhere(audience, orgId);
  const [total, consented] = await Promise.all([
    db.user.count({ where }),
    db.user.count({ where: { ...where, emailConsent: true } }),
  ]);

  return NextResponse.json({ total, consented });
}

/** POST /api/superadmin/email — send broadcast */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const body = await request.json() as {
    subject:  string;
    html:     string;
    audience: "all" | "pro" | "tenant";
    orgId?:   string;
  };

  if (!body.subject?.trim() || !body.html?.trim()) {
    return NextResponse.json({ error: "Emne og innhold er påkrevd" }, { status: 400 });
  }

  const where = buildWhere(body.audience, body.orgId);
  const users = await db.user.findMany({
    where:  { ...where, emailConsent: true },
    select: { email: true },
  });

  const emails = users.map((u) => u.email);
  if (emails.length === 0) {
    return NextResponse.json({ error: "Ingen mottakere med epostsamtykke" }, { status: 400 });
  }

  await sendMarketingEmail(emails, body.subject.trim(), body.html);

  return NextResponse.json({ sent: emails.length });
}

function buildWhere(audience: string, orgId?: string | null) {
  if (audience === "pro") {
    return {
      memberships: { some: { organization: { plan: { in: ["PRO", "ENTERPRISE"] as never[] } } } },
    };
  }
  if (audience === "tenant" && orgId) {
    return {
      memberships: { some: { organizationId: orgId } },
    };
  }
  return {}; // all
}
