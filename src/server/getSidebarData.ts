import type { OwnerProfile, SidebarSettings } from "@/components/OwnerSidebar";

export const DEFAULT_SIDEBAR_SETTINGS: SidebarSettings = {
  showStatus:       true,
  showBio:          true,
  showWebsite:      true,
  showSocials:      true,
  showStats:        true,
  showMemberCount:  true,
  showPostCount:    true,
  showCreatedAt:    true,
  showStreamStatus: true,
  customTitle:      null,
  customText:       null,
  showCustomText:   false,
  showTopPoints:    false,
};

export interface TopMember {
  name:      string | null;
  avatarUrl: string | null;
  username:  string | null;
  points:    number;
}

export interface SidebarData {
  ownerProfile:    OwnerProfile;
  postCount:       number;
  liveEnabled:     boolean;
  sidebarSettings: SidebarSettings;
  topMembers:      TopMember[];
}

/** Fetch all data needed to render OwnerSidebar for a COMMUNITY org. */
export async function getSidebarData(
  organizationId: string,
  orgCreatedAt: Date,
): Promise<SidebarData | null> {
  const { db } = await import("@/server/db");

  const [ownerMembership, postCount, streamSettings, rawSettings, topMemberships] = await Promise.all([
    db.membership.findFirst({
      where:  { organizationId, role: "OWNER" },
      select: {
        username: true,
        user: {
          select: {
            id:          true,
            name:        true,
            avatarUrl:   true,
            bio:         true,
            website:     true,
            socialLinks: true,
            status:      true,
          },
        },
      },
    }),
    db.post.count({ where: { orgId: organizationId } }),
    db.streamSettings.findUnique({
      where:  { organizationId },
      select: { id: true },
    }),
    db.profileSidebarSettings.findUnique({
      where: { organizationId },
    }),
    db.membership.findMany({
      where:   { organizationId },
      orderBy: { points: "desc" },
      take:    3,
      select: {
        points:   true,
        username: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    }),
  ]);

  if (!ownerMembership) return null;

  const ownerProfile: OwnerProfile = {
    userId:       ownerMembership.user.id,
    name:         ownerMembership.user.name ?? null,
    avatarUrl:    ownerMembership.user.avatarUrl ?? null,
    bio:          ownerMembership.user.bio ?? null,
    website:      ownerMembership.user.website ?? null,
    socialLinks:  ownerMembership.user.socialLinks as OwnerProfile["socialLinks"],
    status:       ownerMembership.user.status ?? null,
    orgUsername:  ownerMembership.username ?? null,
    orgCreatedAt: orgCreatedAt.toISOString(),
  };

  const sidebarSettings: SidebarSettings = rawSettings
    ? {
        showStatus:       rawSettings.showStatus,
        showBio:          rawSettings.showBio,
        showWebsite:      rawSettings.showWebsite,
        showSocials:      rawSettings.showSocials,
        showStats:        rawSettings.showStats,
        showMemberCount:  rawSettings.showMemberCount,
        showPostCount:    rawSettings.showPostCount,
        showCreatedAt:    rawSettings.showCreatedAt,
        showStreamStatus: rawSettings.showStreamStatus,
        customTitle:      rawSettings.customTitle,
        customText:       rawSettings.customText,
        showCustomText:   rawSettings.showCustomText,
        showTopPoints:    rawSettings.showTopPoints,
      }
    : DEFAULT_SIDEBAR_SETTINGS;

  const topMembers: TopMember[] = topMemberships.map((m) => ({
    name:      m.user.name ?? null,
    avatarUrl: m.user.avatarUrl ?? null,
    username:  m.username ?? null,
    points:    m.points,
  }));

  return {
    ownerProfile,
    postCount,
    liveEnabled: !!streamSettings,
    sidebarSettings,
    topMembers,
  };
}
