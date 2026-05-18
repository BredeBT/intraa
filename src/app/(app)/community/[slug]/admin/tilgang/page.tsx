import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import AccessModePicker from "./AccessModePicker";

export default async function CommunityTilgangPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id:         true,
      name:       true,
      slug:       true,
      accessMode: true,
      _count:     { select: { memberships: true, fanPasses: { where: { status: "ACTIVE", endDate: { gt: new Date() } } } } },
    },
  });
  if (!org) notFound();

  // Only owner / admin can view this page
  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    redirect(`/community/${slug}`);
  }

  const broadcastChannel = await db.channel.findFirst({
    where:  { orgId: org.id, type: "BROADCAST" },
    select: { id: true, name: true },
  });

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Tilgang & Fanpass</h1>
        <p className="text-sm text-zinc-500">
          Bestem hvordan folk får tilgang til {org.name}.
        </p>
      </div>

      <AccessModePicker
        orgSlug={org.slug}
        currentMode={org.accessMode}
        memberCount={org._count.memberships}
        fanpassCount={org._count.fanPasses}
        broadcastChannelName={broadcastChannel?.name ?? null}
      />
    </div>
  );
}
