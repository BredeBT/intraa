import { NextRequest, NextResponse } from "next/server";
import { auth }   from "@/auth";
import { db }     from "@/server/db";
import { resend } from "@/lib/resend";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@intraa.net";

function formatContent(text: string): string {
  // Escape HTML entities first, then convert newlines to <br>/<p>
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split("\n\n")
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:rgba(255,255,255,0.56);font-size:15px;line-height:1.7;">${
          paragraph.split("\n").join("<br/>")
        }</p>`
    )
    .join("");
}

function buildHtml(content: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d0d14;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#12121e;border-radius:12px;padding:32px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <div style="width:36px;height:36px;border-radius:8px;background:#6c47ff;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;">I</div>
      <span style="color:white;font-size:18px;font-weight:600;">Intraa</span>
    </div>
    ${formatContent(content)}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />
    <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">
      Du mottar denne eposten fordi du er registrert på intraa.net.<br/>
      <a href="https://intraa.net/avmeldt" style="color:#6c47ff;">Meld deg av epostlisten</a>
    </p>
  </div>
</body>
</html>`;
}

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
    content:  string;
    audience: "all" | "pro" | "tenant";
    orgId?:   string;
  };

  if (!body.subject?.trim() || !body.content?.trim()) {
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

  const subject = body.subject.trim();
  const html    = buildHtml(body.content.trim());
  const text    = body.content.trim();

  for (let i = 0; i < emails.length; i += 50) {
    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      emails.slice(i, i + 50),
      subject,
      html,
      text,
    });
  }

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
