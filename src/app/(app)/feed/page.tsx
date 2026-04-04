import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getPosts } from "@/server/actions/posts";
import ComposeBox from "./ComposeBox";
import PostList from "./PostList";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { organization: { createdAt: "asc" } },
  });

  if (!membership) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 text-center text-zinc-500">
        Du er ikke medlem av noen organisasjon ennå.
      </div>
    );
  }

  const posts = await getPosts(membership.organizationId);

  const initials = (session.user.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Feed</h1>

      <ComposeBox
        orgId={membership.organizationId}
        userInitials={initials}
      />

      <PostList posts={posts} />
    </div>
  );
}
