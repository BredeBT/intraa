import { redirect } from "next/navigation";
import { auth }     from "@/auth";
import { db }       from "@/server/db";
import SuperAdminNav from "../SuperAdminNav";
import EmailClient   from "./EmailClient";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export default async function EpostPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const [orgs, userCount, consentCount] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.count(),
    db.user.count({ where: { emailConsent: true } }),
  ]);

  return (
    <div className="px-8 py-8">
      <SuperAdminNav />

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Epost</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Send epost til brukere. Totalt{" "}
          <strong className="text-white">{userCount.toLocaleString("nb")}</strong> brukere,{" "}
          <strong className="text-white">{consentCount.toLocaleString("nb")}</strong> med epostsamtykke.
        </p>
      </div>

      <EmailClient orgs={orgs} />
    </div>
  );
}
