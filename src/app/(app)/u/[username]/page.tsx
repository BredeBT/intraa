import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

const USER_SELECT = {
  id:          true,
  name:        true,
  username:    true,
  avatarUrl:   true,
  bannerUrl:   true,
  bio:         true,
  interests:   true,
  socialLinks: true,
  isPublic:    true,
  createdAt:   true,
  memberships: {
    include: {
      organization: {
        select: { id: true, slug: true, name: true, type: true, theme: { select: { logoUrl: true } } },
      },
    },
  },
} as const;

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { username: rawUsername } = await params;

  // Strip leading @ if present (e.g. /u/@Brede → lookup "Brede")
  const username = decodeURIComponent(rawUsername).replace(/^@/, "");

  const profileUser = await db.user.findUnique({
    where: { username },
    select: {
      ...USER_SELECT,
      friendsSent:     { where: { receiverId: session.user.id }, select: { id: true, status: true } },
      friendsReceived: { where: { senderId:   session.user.id }, select: { id: true, status: true } },
    },
  });

  if (!profileUser) notFound();
  if (!profileUser.isPublic && profileUser.id !== session.user.id) notFound();

  const isOwnProfile = profileUser.id === session.user.id;

  const sentRequest     = profileUser.friendsReceived[0]; // I sent to them
  const receivedRequest = profileUser.friendsSent[0];      // they sent to me

  let friendStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
  let friendshipId: string | null = null;

  if (sentRequest) {
    friendStatus = sentRequest.status === "ACCEPTED" ? "accepted" : "pending_sent";
    friendshipId = sentRequest.id;
  } else if (receivedRequest) {
    friendStatus = receivedRequest.status === "ACCEPTED" ? "accepted" : "pending_received";
    friendshipId = receivedRequest.id;
  }

  const [friendCount, purchases, totalCoinsAgg, activeFanpass] = await Promise.all([
    db.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: profileUser.id }, { receiverId: profileUser.id }],
      },
    }),
    db.shopPurchase.findMany({
      where: { userId: profileUser.id },
      include: {
        shopItem:     true,
        organization: { select: { name: true, slug: true } },
      },
    }),
    db.membership.aggregate({
      where: { userId: profileUser.id },
      _sum:  { points: true },
    }),
    db.fanPass.findFirst({
      where: {
        userId:  profileUser.id,
        status:  "ACTIVE",
        endDate: { gt: new Date() },
      },
      include: { organization: { select: { name: true } } },
    }),
  ]);

  const badges       = purchases?.filter((p) => p.shopItem.type === "BADGE") ?? [];
  const nameColor    = purchases?.find((p) => p.shopItem.type === "NAME_COLOR") ?? null;
  const profileFrame = purchases?.find((p) => p.shopItem.type === "PROFILE_FRAME") ?? null;
  const totalCoins   = totalCoinsAgg._sum.points ?? 0;

  const communities = profileUser.memberships
    .filter((m) => m.organization.type === "COMMUNITY")
    .map((m) => ({
      id:      m.organization.id,
      slug:    m.organization.slug,
      name:    m.organization.name,
      logoUrl: m.organization.theme?.logoUrl ?? null,
      role:    m.role as string,
      points:  m.points,
    }));

  return (
    <div className="min-h-screen bg-zinc-950">
      <ProfileClient
        profile={{
          id:          profileUser.id,
          name:        profileUser.name,
          username:    profileUser.username,
          avatarUrl:   profileUser.avatarUrl,
          bannerUrl:   profileUser.bannerUrl,
          bio:         profileUser.bio,
          interests:   profileUser.interests,
          socialLinks: profileUser.socialLinks as Record<string, string> | null,
          createdAt:   profileUser.createdAt.toISOString(),
        }}
        isOwnProfile={isOwnProfile}
        friendStatus={friendStatus}
        friendshipId={friendshipId}
        friendCount={friendCount}
        communities={communities}
        currentUserId={session.user.id}
        badges={badges.map((b) => ({
          id:           b.id,
          shopItem:     { name: b.shopItem.name, value: b.shopItem.value },
          organization: { name: b.organization.name },
        }))}
        nameColor={nameColor ? { shopItem: { value: nameColor.shopItem.value } } : null}
        profileFrame={profileFrame ? { shopItem: { value: profileFrame.shopItem.value } } : null}
        totalCoins={totalCoins}
        activeFanpass={activeFanpass ? { organization: { name: activeFanpass.organization.name } } : null}
      />
    </div>
  );
}
