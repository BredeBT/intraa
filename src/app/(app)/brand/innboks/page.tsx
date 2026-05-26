import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import ThreadList from "@/components/sponsor/ThreadList";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function BrandInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Krev sponsor-profil
  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true },
  });
  if (!sponsor) redirect("/brand/dashboard");

  return (
    <ThreadList
      basePath="/brand/innboks"
      viewerRole="SPONSOR"
      title="Sponsor-innboks"
      subtitle="Alle samtaler du har startet med creators."
    />
  );
}
