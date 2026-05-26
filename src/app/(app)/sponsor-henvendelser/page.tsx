import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import ThreadList from "@/components/sponsor/ThreadList";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function SponsorHenvendelserPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Tilgjengelig for creators (selv om vi viser tom-state for andre rolletyper)
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { userType: true },
  });
  if (!user) redirect("/home");

  return (
    <ThreadList
      basePath="/sponsor-henvendelser"
      viewerRole="CREATOR"
      title="Sponsor-henvendelser"
      subtitle={user.userType === "CREATOR"
        ? "Brand som vil samarbeide med deg. Helt separat fra vanlige meldinger."
        : "Du må være creator for å motta sponsor-henvendelser. Endre rolle i innstillinger."}
    />
  );
}
