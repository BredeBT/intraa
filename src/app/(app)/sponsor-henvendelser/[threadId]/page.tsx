import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ThreadView from "@/components/sponsor/ThreadView";

export const dynamic = "force-dynamic";

export default async function CreatorThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { threadId } = await params;
  return <ThreadView threadId={threadId} backPath="/sponsor-henvendelser" />;
}
