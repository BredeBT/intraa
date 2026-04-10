import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const { name, type } = await req.json() as { name?: string; type?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return NextResponse.json({ error: "Ugyldig navn" }, { status: 400 });

  const channelType = type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEXT";

  const existing = await db.channel.findFirst({
    where: { orgId: ctx.organizationId, name: slug },
  });
  if (existing) return NextResponse.json({ error: "En kanal med dette navnet finnes allerede" }, { status: 409 });

  const channel = await db.channel.create({
    data: { orgId: ctx.organizationId, name: slug, type: channelType },
  });

  return NextResponse.json({ id: channel.id, name: channel.name, type: channel.type });
}
