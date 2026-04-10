import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import DangerActions from "./DangerActions";

export default async function FaresonePage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  return (
    <div className="px-8 py-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Faresone</h2>
      <p className="mb-6 text-sm text-zinc-500">Disse handlingene er irreversible. Vær sikker på hva du gjør.</p>

      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-5">
          <h3 className="mb-1 font-medium text-amber-400">Suspender organisasjon</h3>
          <p className="mb-4 text-sm text-zinc-400">
            Medlemmer vil ikke kunne logge inn eller bruke tjenesten. Ingen data slettes.
          </p>
          <DangerActions orgId={org.id} orgName={org.name} action="suspend" />
        </div>

        <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-5">
          <h3 className="mb-1 font-medium text-red-400">Slett organisasjon</h3>
          <p className="mb-4 text-sm text-zinc-400">
            Sletter organisasjonen og all tilhørende data permanent. Kan ikke angres.
          </p>
          <DangerActions orgId={org.id} orgName={org.name} action="delete" />
        </div>
      </div>
    </div>
  );
}
