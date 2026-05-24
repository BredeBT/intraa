import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import LagretClient from "./LagretClient";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function LagretPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const bookmarks = await db.bookmark.findMany({
    where:   { userId },
    include: {
      post: {
        include: {
          author:       { select: { id: true, name: true, avatarUrl: true } },
          organization: { select: { id: true, slug: true, name: true } },
          _count:       { select: { likes: true, comments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take:    100,
  });

  const items = bookmarks.map((b) => ({
    bookmarkId:   b.id,
    bookmarkedAt: b.createdAt.toISOString(),
    post: {
      id:           b.post.id,
      content:      b.post.content,
      imageUrl:     b.post.imageUrl,
      createdAt:    b.post.createdAt.toISOString(),
      author:       b.post.author,
      organization: b.post.organization,
      likeCount:    b.post._count.likes,
      commentCount: b.post._count.comments,
    },
  }));

  return <LagretClient items={items} />;
}
