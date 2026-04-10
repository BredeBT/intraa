import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FaresonePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
  });
  if (!membership || membership.role !== "OWNER") redirect("/admin");

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <h1 className="text-xl font-semibold text-white">Faresone</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Handlinger her kan ikke angres. Vær forsiktig.</p>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="mb-1 text-sm font-semibold text-red-400">Slett organisasjon</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Dette vil permanent slette alle data tilknyttet organisasjonen — brukere, kanaler, tickets og filer. Handlingen kan ikke angres.
        </p>
        <button
          disabled
          className="rounded-lg bg-red-600/30 px-4 py-2 text-sm font-semibold text-red-400 opacity-50 cursor-not-allowed"
        >
          Slett organisasjon — Kontakt Intraa support
        </button>
      </div>
    </div>
  );
}
