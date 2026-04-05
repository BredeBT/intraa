import { redirect } from "next/navigation";
import { getUserOrg } from "@/server/getUserOrg";
import { getPosts } from "@/server/actions/posts";
import FeedClient from "@/app/(app)/feed/FeedClient";
import { auth } from "@/auth";

export default async function CommunityFeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ctx = await getUserOrg();
  if (!ctx) redirect("/login");

  const posts = await getPosts(ctx.organizationId);

  return (
    <FeedClient
      initialPosts={posts}
      orgId={ctx.organizationId}
      userId={ctx.userId}
      userName={session.user.name ?? ""}
    />
  );
}
