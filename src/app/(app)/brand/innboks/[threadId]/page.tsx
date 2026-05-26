import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import ThreadView from "@/components/sponsor/ThreadView";

export const dynamic = "force-dynamic";

export default async function BrandThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true },
  });
  if (!sponsor) redirect("/brand/dashboard");

  const { threadId } = await params;
  return <ThreadView threadId={threadId} backPath="/brand/innboks" />;
}
