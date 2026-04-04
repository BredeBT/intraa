import { getPosts } from "@/server/actions/posts";
import PostList from "./PostList";

const MOCK_ORG_ID = "mock-org";

export default async function FeedPage() {
  const posts = await getPosts(MOCK_ORG_ID);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Feed</h1>

      {/* Compose box */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            DU
          </div>
          <div className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500 cursor-text">
            Skriv noe…
          </div>
        </div>
      </div>

      <PostList posts={posts} />
    </div>
  );
}
