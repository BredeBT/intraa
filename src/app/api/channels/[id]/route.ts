import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

async function requireAdminForChannel(userId: string, channelId: string) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return null;

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: channel.orgId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) return null;

  return channel;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await requireAdminForChannel(session.user.id, id);
  if (!channel) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { name, type } = await req.json() as { name?: string; type?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return NextResponse.json({ error: "Ugyldig navn" }, { status: 400 });

  const channelType = type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEXT";

  const updated = await db.channel.update({
    where: { id },
    data:  { name: slug, type: channelType },
  });

  return NextResponse.json({ id: updated.id, name: updated.name, type: updated.type });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await requireAdminForChannel(session.user.id, id);
  if (!channel) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  // Prevent deleting the last channel
  const count = await db.channel.count({ where: { orgId: channel.orgId } });
  if (count <= 1) return NextResponse.json({ error: "Kan ikke slette siste kanal" }, { status: 400 });

  // Cascade delete messages first
  await db.message.deleteMany({ where: { channelId: id } });
  await db.channel.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
