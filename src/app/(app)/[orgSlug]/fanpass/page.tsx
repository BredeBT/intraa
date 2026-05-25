import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import FanpassWelcome from "./FanpassWelcome";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function FanpassPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { orgSlug } = await params;

  const org = await db.organization.findUnique({
    where:  { slug: orgSlug },
    select: {
      id: true, slug: true, name: true,
      theme:           { select: { logoUrl: true, bannerUrl: true, bannerPreset: true } },
      streamSettings:  { select: { twitchChannel: true, youtubeChannel: true } },
    },
  });
  if (!org) notFound();

  const [fanpass, fanpassChannelCount, totalChannelCount] = await Promise.all([
    db.fanPass.findFirst({
      where: {
        userId:         session.user.id,
        organizationId: org.id,
        status:         "ACTIVE",
        endDate:        { gt: new Date() },
      },
      select: { id: true, startDate: true, endDate: true, paidAmount: true, createdAt: true },
    }),
    db.channel.count({ where: { orgId: org.id, requiresFanpass: true } }),
    db.channel.count({ where: { orgId: org.id } }),
  ]);

  return (
    <FanpassWelcome
      org={{
        id:       org.id,
        slug:     org.slug,
        name:     org.name,
        logoUrl:  org.theme?.logoUrl ?? null,
      }}
      hasActiveFanpass={!!fanpass}
      fanpassEnd={fanpass?.endDate.toISOString() ?? null}
      fanpassChannelCount={fanpassChannelCount}
      totalChannelCount={totalChannelCount}
      hasStreaming={!!(org.streamSettings?.twitchChannel || org.streamSettings?.youtubeChannel)}
    />
  );
}
