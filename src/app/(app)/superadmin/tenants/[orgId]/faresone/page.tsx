import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { SuspendAction, DeleteAction } from "./DangerActions";

export default async function FaresonePage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  return (
    <div className="px-8 py-8" style={{ color: "rgba(255,255,255,0.9)" }}>
      <h2 className="mb-1 text-lg font-semibold text-white">Faresone</h2>
      <p className="mb-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
        Disse handlingene er irreversible. Vær sikker på hva du gjør.
      </p>

      <div className="max-w-lg space-y-4">
        {/* Deactivate */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(180,83,9,0.08)",
            border:     "1px solid rgba(180,83,9,0.3)",
          }}
        >
          <h3 className="mb-1 text-sm font-semibold" style={{ color: "#fbbf24" }}>
            Deaktiver tenant
          </h3>
          <p className="mb-4 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Community skjules fra discovery. Eksisterende medlemmer beholder tilgang.
          </p>
          <SuspendAction orgId={org.id} />
        </div>

        {/* Delete */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(220,38,38,0.07)",
            border:     "1px solid rgba(220,38,38,0.25)",
          }}
        >
          <h3 className="mb-1 text-sm font-semibold" style={{ color: "#f87171" }}>
            Slett tenant permanent
          </h3>
          <p className="mb-4 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Sletter organisasjonen og all tilhørende data. Kan ikke angres.
          </p>
          <DeleteAction orgId={org.id} orgSlug={org.slug} />
        </div>
      </div>
    </div>
  );
}
