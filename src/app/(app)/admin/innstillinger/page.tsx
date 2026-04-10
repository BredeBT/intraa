import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";
import InnstillingerClient from "./InnstillingerClient";

export default async function InnstillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { organizationId, role } = await requireAdmin();
  const { tab } = await searchParams;

  const [org, theme, featureRows, streamSettings] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId } }),
    db.tenantTheme.findUnique({ where: { organizationId } }),
    db.organizationFeature.findMany({ where: { organizationId } }),
    db.streamSettings.findUnique({ where: { organizationId } }),
  ]);

  if (!org) return null;

  // Auto-seed features if empty
  let features = featureRows;
  if (features.length === 0) {
    await seedDefaultFeatures(organizationId, org.type);
    features = await db.organizationFeature.findMany({ where: { organizationId } });
  }

  const themeInitial = {
    logoUrl:        theme?.logoUrl        ?? null,
    bannerUrl:      theme?.bannerUrl      ?? null,
    bannerPreset:   theme?.bannerPreset   ?? null,
    avatarPreset:   theme?.avatarPreset   ?? null,
    borderRadius:   theme?.borderRadius   ?? "rounded-lg",
    fontStyle:      theme?.fontStyle      ?? "default",
    welcomeMessage: theme?.welcomeMessage ?? "",
  };

  const featureMap = Object.fromEntries(features.map((f) => [f.feature, f.enabled]));

  return (
    <InnstillingerClient
      initialTab={tab ?? "generelt"}
      org={{ id: org.id, name: org.name, slug: org.slug, type: org.type, plan: org.plan }}
      theme={themeInitial}
      features={featureMap}
      userRole={role}
      streamSettings={{
        twitchChannel:     streamSettings?.twitchChannel     ?? "",
        youtubeChannel:    streamSettings?.youtubeChannel    ?? "",
        preferredPlatform: streamSettings?.preferredPlatform ?? "twitch",
      }}
    />
  );
}
