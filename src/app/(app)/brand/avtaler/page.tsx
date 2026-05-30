import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { FileText, Plus, ArrowLeft } from "lucide-react";
import { bumpExpiredAgreements } from "@/lib/sponsorAgreements";
import AgreementsClient from "./AgreementsClient";

export const dynamic = "force-dynamic";

export default async function SponsorAgreementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sponsor = await db.sponsorProfile.findUnique({
    where:  { userId: session.user.id },
    select: {
      id: true, brandName: true, orgNumber: true, contactEmail: true, contactPhone: true,
    },
  });
  if (!sponsor) redirect("/home");

  await bumpExpiredAgreements();

  // Hent creators sponsoren har en akseptert tråd med — disse er aktuelle
  // partnere for en formell avtale. Mer ryddig enn å la sponsor søke i
  // hele creator-katalogen herfra.
  const threadCreators = await db.sponsorThread.findMany({
    where:    { sponsorId: sponsor.id, status: "ACCEPTED" },
    select:   {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    distinct: ["creatorId"],
  });

  const agreements = await db.sponsorAgreement.findMany({
    where:    { sponsorId: sponsor.id },
    orderBy:  { updatedAt: "desc" },
    include:  {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/brand/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Tilbake til dashboard
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
               style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sponsoravtaler</h1>
            <p className="text-sm text-white/50">
              Formelle samarbeids-avtaler med creators. Når en avtale er aktiv kan creator tagge brandet
              ditt i innlegg og broadcasts i avtalt periode.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/60 leading-relaxed">
          <p className="mb-1 font-semibold text-white/80">Slik fungerer det:</p>
          <ol className="space-y-1 pl-5 list-decimal">
            <li>Du fyller ut malen med org.nr, kontakt, periode og hva creator skal levere</li>
            <li>Sender til creator — de mottar avtalen i sin innboks for digital signering</li>
            <li>Når begge har signert er avtalen ACTIVE og creator kan tagge brandet i avtalt periode</li>
            <li>Du kan avslutte (revoke) avtalen når som helst hvis behovet endrer seg</li>
          </ol>
          <p className="mt-3 text-white/40">
            Intraa er ikke juridisk eller økonomisk part i avtalen. Vi dokumenterer kun samarbeidet.
          </p>
        </div>

        <AgreementsClient
          sponsorDefaults={{
            brandName:    sponsor.brandName,
            orgNumber:    sponsor.orgNumber    ?? "",
            contactEmail: sponsor.contactEmail ?? "",
            contactPhone: sponsor.contactPhone ?? "",
          }}
          threadCreators={threadCreators.map((t) => t.creator)}
          initialAgreements={agreements.map((a) => ({
            ...a,
            periodStart:     a.periodStart.toISOString(),
            periodEnd:       a.periodEnd.toISOString(),
            createdAt:       a.createdAt.toISOString(),
            updatedAt:       a.updatedAt.toISOString(),
            sponsorSignedAt: a.sponsorSignedAt?.toISOString() ?? null,
            creatorSignedAt: a.creatorSignedAt?.toISOString() ?? null,
            revokedAt:       a.revokedAt?.toISOString() ?? null,
          }))}
        />

        {threadCreators.length === 0 && agreements.length === 0 && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <Plus className="mx-auto mb-3 h-6 w-6 text-white/40" />
            <p className="text-sm text-white/70 mb-1">Ingen aktive samtaler enda</p>
            <p className="text-xs text-white/40 max-w-md mx-auto">
              For å opprette en avtale må du først ha en akseptert henvendelse med creatoren via{" "}
              <Link href="/brand/creators" className="text-purple-400 hover:underline">Finn creators</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
