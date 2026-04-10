import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";

// POST /api/support/ticket — create a support ticket directed at Intraa support org
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const { title, description, category } = await req.json() as {
    title?:       string;
    description?: string;
    category?:    string;
  };

  if (!title?.trim())       return NextResponse.json({ error: "Tittel er påkrevd" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Beskrivelse er påkrevd" }, { status: 400 });

  // Find Intraa support org
  const supportOrg = await db.organization.findUnique({ where: { slug: "intraa-support" } });
  if (!supportOrg) return NextResponse.json({ error: "Støtteorganisasjonen er ikke konfigurert" }, { status: 500 });

  const ticket = await db.ticket.create({
    data: {
      orgId:        supportOrg.id,
      authorId:     session.user.id,
      title:        title.trim(),
      description:  description.trim(),
      // category is now a relation; support tickets don't use internal categories
      source:       "SUPPORT",
      fromTenantId: ctx.organizationId,
    },
  });

  // Notify all OWNER/ADMIN in support org
  const supportAdmins = await db.membership.findMany({
    where: { organizationId: supportOrg.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });

  if (supportAdmins.length > 0) {
    await db.notification.createMany({
      data: supportAdmins.map((m) => ({
        type:           "TICKET" as const,
        title:          "Ny support-henvendelse",
        body:           `${session.user.name ?? "En bruker"}: ${title.trim()}`,
        href:           `/superadmin/support/${ticket.id}`,
        userId:         m.userId,
        organizationId: supportOrg.id,
      })),
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
