export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { getPosts } from "@/server/actions/posts";
import { checkFeature } from "@/server/checkFeature";
import { BANNER_PRESETS } from "@/lib/themePresets";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await checkFeature("feed");

  const ctx = await getUserOrg();

  if (!ctx) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 text-center text-zinc-500">
        Du er ikke medlem av noen organisasjon ennå.
      </div>
    );
  }

  const { db } = await import("@/server/db");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const weekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [posts, org, theme, memberCount, liveSession, onlineCount, weekPostCount] = await Promise.all([
    getPosts(ctx.organizationId),
    db.organization.findUnique({
      where:  { id: ctx.organizationId },
      select: { id: true, name: true, type: true, slug: true, createdAt: true },
    }),
    db.tenantTheme.findUnique({
      where:  { organizationId: ctx.organizationId },
      select: { bannerUrl: true, bannerPreset: true, logoUrl: true, welcomeMessage: true },
    }),
    db.membership.count({ where: { organizationId: ctx.organizationId } }),
    db.streamSession.findFirst({
      where:  { organizationId: ctx.organizationId, endedAt: null },
      select: { id: true },
    }),
    db.user.count({
      where: {
        memberships: { some: { organizationId: ctx.organizationId } },
        lastActive:  { gte: fiveMinAgo },
      },
    }),
    db.post.count({
      where: { orgId: ctx.organizationId, createdAt: { gte: weekAgo } },
    }),
  ]);

  // Resolve banner background
  const bannerBg = theme?.bannerUrl
    ? `url(${theme.bannerUrl}) center/cover`
    : theme?.bannerPreset
      ? BANNER_PRESETS.find((p) => p.id === theme.bannerPreset)?.css
      : undefined;

  return (
    <div className="h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <FeedClient
        initialPosts={posts}
        orgId={ctx.organizationId}
        userId={ctx.userId}
        userName={session.user.name ?? ""}
        isSuperAdmin={session.user.isSuperAdmin ?? false}
        logoUrl={theme?.logoUrl ?? null}
        orgName={org?.name ?? ""}
        orgType={org?.type ?? "COMPANY"}
        orgSlug={org?.slug ?? null}
        orgCreatedAt={org?.createdAt.toISOString() ?? ""}
        memberCount={memberCount}
        onlineCount={onlineCount}
        weekPostCount={weekPostCount}
        welcomeMessage={theme?.welcomeMessage ?? null}
        bannerBg={bannerBg ?? null}
        initialIsLive={!!liveSession}
      />
    </div>
  );
}
