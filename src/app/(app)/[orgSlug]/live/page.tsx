import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import LiveClient from "@/app/(app)/live/LiveClient";

export default async function LivePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await params;

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!org) notFound();

  // Check membership and live feature
  const [membership, featureRow] = await Promise.all([
    db.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
      select: { role: true },
    }),
    db.organizationFeature.findUnique({
      where: { organizationId_feature: { organizationId: org.id, feature: "live" } },
    }),
  ]);

  if (!membership) redirect("/feed");
  if (featureRow && !featureRow.enabled) notFound();

  const [streamSettings, theme] = await Promise.all([
    db.streamSettings.findUnique({ where: { organizationId: org.id } }),
    db.tenantTheme.findUnique({
      where: { organizationId: org.id },
      select: { logoUrl: true },
    }),
  ]);

  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <LiveClient
      orgId={org.id}
      userId={session.user.id}
      orgName={org.name}
      orgSlug={org.slug}
      logoUrl={theme?.logoUrl ?? null}
      twitchChannel={streamSettings?.twitchChannel ?? null}
      youtubeChannel={streamSettings?.youtubeChannel ?? null}
      preferredPlatform={(streamSettings?.preferredPlatform ?? "twitch") as "twitch" | "youtube"}
      isAdmin={isAdmin}
    />
  );
}
