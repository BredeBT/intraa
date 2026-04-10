import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";

export default async function MegPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { username: true, name: true },
  });

  // Prefer username, fall back to name (stripped of spaces), then user id
  // Strip leading @ in case username was stored with it
  const rawSlug =
    user?.username ??
    user?.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ??
    session.user.id;
  const slug = rawSlug.replace(/^@/, "");

  redirect(`/u/${slug}`);
}
