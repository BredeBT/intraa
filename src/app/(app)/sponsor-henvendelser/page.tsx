import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import CreatorSponsorTabs from "@/components/sponsor/CreatorSponsorTabs";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function SponsorHenvendelserPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { userType: true },
  });
  if (!user) redirect("/home");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <CreatorSponsorTabs
        title="Sponsor-henvendelser"
        subtitle={user.userType === "CREATOR"
          ? "Brand som vil samarbeide med deg, og formelle avtaler du har signert. Helt separat fra vanlige meldinger."
          : "Du må være creator for å motta sponsor-henvendelser. Endre rolle i innstillinger."}
      />
    </div>
  );
}
