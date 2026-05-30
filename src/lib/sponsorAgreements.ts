import { db } from "@/server/db";
import type { SponsorAgreementStatus } from "@prisma/client";

/**
 * Standard-disclaimer som settes på hver avtale ved signering. Kan ikke
 * endres av partene. Intraa er IKKE juridisk eller økonomisk part i
 * avtalen — vi fasiliterer kun dokumentasjonen.
 */
export const INTRAA_DISCLAIMER = `
Intraa AS fasiliterer kun dette dokumentet og er ikke part i avtalen mellom
sponsor og creator. Avtalen er kun mellom de to signerende partene. Intraa
gir ingen garanti for at avtalen er fullstendig eller juridisk gyldig — det
er partenes eget ansvar å sørge for at innholdet dekker deres behov.

Eventuell betaling, fakturering, levering og oppfølging skjer direkte
mellom sponsor og creator. Intraa er ikke involvert økonomisk og kan
ikke holdes ansvarlig for tvister, forsinkelser eller mislighold.

Brudd på akseptabel bruk (se Intraa sine vilkår) kan føre til at avtalen
blir suspendert eller at brukerkontoer blir stengt, uavhengig av avtalens
status mellom partene.
`.trim();

/** Velkjent set av statuser hvor avtalen IKKE lenger gir tagging-rett. */
export const INACTIVE_STATUSES: SponsorAgreementStatus[] = [
  "DRAFT",
  "PENDING_CREATOR",
  "EXPIRED",
  "REVOKED",
];

/**
 * Auto-flytt ACTIVE-avtaler til EXPIRED når periodEnd har passert.
 * Idempotent — trygt å kalle ved hvert leseoperasjon. Returnerer antall
 * oppdaterte rader. Vi unngår en cron-jobb ved å kalle dette i hot-path
 * (les av agreements på sponsor og creator side).
 */
export async function bumpExpiredAgreements(): Promise<number> {
  try {
    const result = await db.sponsorAgreement.updateMany({
      where:  { status: "ACTIVE", periodEnd: { lt: new Date() } },
      data:   { status: "EXPIRED" },
    });
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Sjekker om det finnes en ACTIVE-avtale mellom denne sponsor-creator-
 * kombinasjonen RETT NÅ. Brukes som consent-gate i Phase B når creator
 * forsøker å tagge en sponsor i et innlegg.
 */
export async function hasActiveAgreement(
  sponsorId: string,
  creatorId: string,
): Promise<boolean> {
  const now = new Date();
  const found = await db.sponsorAgreement.findFirst({
    where: {
      sponsorId,
      creatorId,
      status:      "ACTIVE",
      periodStart: { lte: now },
      periodEnd:   { gte: now },
    },
    select: { id: true },
  });
  return !!found;
}
