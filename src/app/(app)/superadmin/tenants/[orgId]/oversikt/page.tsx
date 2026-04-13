import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import OversiktClient from "./OversiktClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function OversiktPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  const [memberCount, postCount, messageCount, channelCount] = await Promise.all([
    db.membership.count({ where: { organizationId: orgId } }),
    db.post.count({ where: { orgId } }),
    db.message.count({ where: { channel: { orgId } } }),
    db.channel.count({ where: { orgId } }),
  ]);

  return (
    <OversiktClient
      org={{
        id:          org.id,
        name:        org.name,
        slug:        org.slug,
        plan:        org.plan as "FREE" | "PRO" | "ENTERPRISE",
        type:        org.type,
        description: org.description,
        createdAt:   org.createdAt.toISOString(),
      }}
      stats={{ members: memberCount, posts: postCount, messages: messageCount, channels: channelCount }}
    />
  );
}
