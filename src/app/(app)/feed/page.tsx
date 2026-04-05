import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getPosts } from "@/server/actions/posts";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where:   { userId: session.user.id },
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

  return (
    <FeedClient
      initialPosts={posts}
      orgId={membership.organizationId}
      userId={session.user.id}
      userName={session.user.name ?? ""}
    />
  );
}
