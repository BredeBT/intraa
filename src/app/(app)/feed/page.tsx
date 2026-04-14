export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { getPosts } from "@/server/actions/posts";
import { checkFeature } from "@/server/checkFeature";
import { getSidebarData } from "@/server/getSidebarData";
import FeedClient from "./FeedClient";
import OwnerSidebar from "@/components/OwnerSidebar";
import { BANNER_PRESETS, AVATAR_PRESETS } from "@/lib/themePresets";

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

  const [posts, org, theme, memberCount, liveSession] = await Promise.all([
    getPosts(ctx.organizationId),
    db.organization.findUnique({
      where:  { id: ctx.organizationId },
      select: { id: true, name: true, type: true, slug: true, createdAt: true },
    }),
    db.tenantTheme.findUnique({
      where:  { organizationId: ctx.organizationId },
      select: { bannerUrl: true, bannerPreset: true, avatarPreset: true, logoUrl: true, welcomeMessage: true },
    }),
    db.membership.count({ where: { organizationId: ctx.organizationId } }),
    db.streamSession.findFirst({
      where:  { organizationId: ctx.organizationId, endedAt: null },
      select: { id: true },
    }),
  ]);

  const isCommunity = org?.type === "COMMUNITY";
  const sidebar = isCommunity && org ? await getSidebarData(ctx.organizationId, org.createdAt) : null;

  return (
    <div className="flex h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)]">

      {/* Venstre: scrollbart feed — scrollbar skjult (vises ellers midt på siden ved sidebar) */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* BANNER – full bredde */}
        {(theme?.bannerUrl ?? theme?.bannerPreset) && (
          <div className="relative h-24 md:h-36 w-full overflow-hidden">
            {theme?.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: BANNER_PRESETS.find((p) => p.id === theme?.bannerPreset)?.css }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
          </div>
        )}

        {/* INNHOLD */}
        <div className={sidebar ? "mx-auto max-w-2xl px-4 md:max-w-4xl md:px-6" : "mx-auto max-w-2xl px-4 md:px-6"}>
          <FeedClient
            initialPosts={posts}
            orgId={ctx.organizationId}
            userId={ctx.userId}
            userName={session.user.name ?? ""}
            isSuperAdmin={session.user.isSuperAdmin ?? false}
            bannerUrl={null}
            logoUrl={theme?.logoUrl ?? null}
            avatarPreset={theme?.avatarPreset ?? null}
            orgName={org?.name ?? ""}
            orgType={org?.type ?? "COMPANY"}
            orgColor="#4f46e5"
            memberCount={memberCount}
            welcomeMessage={theme?.welcomeMessage ?? null}
            orgSlug={org?.slug ?? null}
            liveEnabled={sidebar?.liveEnabled ?? false}
            initialIsLive={!!liveSession}
          />
        </div>
      </div>

      {/* Høyre: fast sidebar — skjult på mobil */}
      {sidebar && (
        <div className="hidden md:block w-80 shrink-0 overflow-y-auto border-l border-zinc-800/50 p-4">
          <OwnerSidebar
            owner={sidebar.ownerProfile}
            orgId={ctx.organizationId}
            orgSlug={org!.slug}
            memberCount={memberCount}
            postCount={sidebar.postCount}
            liveEnabled={sidebar.liveEnabled}
            currentUserId={session.user.id}
            isSuperAdmin={session.user.isSuperAdmin ?? false}
            settings={sidebar.sidebarSettings}
            topMembers={sidebar.topMembers}
          />
        </div>
      )}
    </div>
  );
}
