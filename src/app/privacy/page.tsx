import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Personvernerklæring — Intraa",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Tilbake
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Personvernerklæring</h1>
        <p className="mb-10 text-sm text-zinc-500">Sist oppdatert: Mai 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          <section>
            <p>
              Intraa er en norsk plattform for communities og creators, og er forpliktet
              til å beskytte personvernet ditt i tråd med GDPR. Denne erklæringen
              forklarer hva vi samler inn, hvorfor, og hvilke rettigheter du har.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">1. Data du gir oss direkte</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">Navn, brukernavn, e-postadresse og passord (hashet med bcrypt) ved registrering</li>
              <li className="list-disc">Profilbilde, bannerbilde, bio, lenker og interesser hvis du fyller dem ut</li>
              <li className="list-disc">Innhold du publiserer: innlegg, kommentarer, meldinger (DM og gruppechat), bilder, GIFs og lydopptak</li>
              <li className="list-disc">Hvilke communities du oppretter eller blir medlem av</li>
              <li className="list-disc">Eventuell to-faktor-autentisering (TOTP-shared-secret lagres kryptert)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. Data vi samler automatisk</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">Tidspunkt for siste aktivitet (for å vise om du er online)</li>
              <li className="list-disc">Coin-balanse og clicker-spillprogresjon</li>
              <li className="list-disc">Streak-data (antall sammenhengende dager med innlogging)</li>
              <li className="list-disc">Lese-bekreftelser i meldinger (når du leser en DM eller kanal)</li>
              <li className="list-disc">IP-adresse og nettlesertype ved innlogging (kun for sikkerhetslogging)</li>
              <li className="list-disc">Hvis du installerer mobilappen: enhetstoken for å sende push-varsler</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. Cookies og lokal lagring</h2>
            <p>
              Vi bruker ingen tredjeparts sporings- eller reklamecookies. Intraa er
              reklamefritt. Vi bruker kun:
            </p>
            <ul className="mt-2 space-y-1.5 pl-4">
              <li className="list-disc"><strong className="text-white">NextAuth session-cookie</strong> (httpOnly, secure) — for å holde deg innlogget</li>
              <li className="list-disc"><strong className="text-white">selected_org-cookie</strong> — husker hvilket community du er aktiv i</li>
              <li className="list-disc"><strong className="text-white">localStorage</strong> — lagrer tema-preferanse (lyst/mørkt/auto) og sidebar-status</li>
              <li className="list-disc"><strong className="text-white">Service Worker-cache</strong> — gjør appen raskere og lar deg lese tidligere innhold offline. Inneholder ingen personlig informasjon.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Push-varsler</h2>
            <p>
              Hvis du aktiverer varsler, lagrer vi enhetstoken (Web Push, eller via
              Firebase Cloud Messaging / Apple Push Notification Service for mobilapp)
              slik at vi kan sende deg meldinger. Vi sender bare varsler du har valgt
              å motta — du kan styre dette i Innstillinger → Varsler eller deaktivere
              tilgang i enhetsinnstillingene.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. Hvordan vi bruker data</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">For å levere og forbedre plattformen</li>
              <li className="list-disc">For å vise innhold til riktige medlemmer (medlemmer av samme community)</li>
              <li className="list-disc">For å sende varsler du har valgt</li>
              <li className="list-disc">For å beregne coin-belønninger og fanpass-status</li>
              <li className="list-disc">For å motvirke misbruk (rate-limiting, sikkerhetslogging)</li>
            </ul>
            <p className="mt-3">
              Vi selger aldri data til tredjeparter. Vi bruker ikke dataene dine til
              annonsering — verken intern eller ekstern.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. Datalagring og lokasjon</h2>
            <p>
              Data lagres på Supabase sine servere i Frankfurt, EU (GDPR-kompatibelt).
              Bilder og filer lagres på Cloudflare R2 og Supabase Storage. Backups
              kjøres automatisk av leverandørene.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Tredjeparts-leverandører vi bruker</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc"><strong className="text-white">Supabase</strong> — database, autentisering-backend, realtime-meldinger</li>
              <li className="list-disc"><strong className="text-white">Vercel</strong> — hosting av webappen</li>
              <li className="list-disc"><strong className="text-white">Cloudflare R2</strong> — fillagring (bilder, vedlegg)</li>
              <li className="list-disc"><strong className="text-white">Resend</strong> — sending av transaksjonelle e-poster (verifisering, varsler)</li>
              <li className="list-disc"><strong className="text-white">Twitch / YouTube</strong> — vi spør deres APIer om en kanal er live, men sender ikke brukerdata til dem</li>
              <li className="list-disc"><strong className="text-white">Firebase Cloud Messaging / Apple Push Notification Service</strong> — for mobilappens push-varsler (sender bare push-token, ingen innhold lagres permanent hos dem)</li>
              <li className="list-disc"><strong className="text-white">Stripe</strong> — vil håndtere betaling for Fanpass når aktivert (ikke aktiv per dags dato)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">8. Dine rettigheter (GDPR)</h2>
            <p>Du har rett til:</p>
            <ul className="mt-2 space-y-1.5 pl-4">
              <li className="list-disc"><strong className="text-white">Innsyn</strong> — be om en eksport av all data vi har om deg</li>
              <li className="list-disc"><strong className="text-white">Retting</strong> — korrigere feil i kontoen din</li>
              <li className="list-disc"><strong className="text-white">Sletting</strong> — be om sletting av kontoen din og all tilhørende data</li>
              <li className="list-disc"><strong className="text-white">Begrensning</strong> — be oss begrense behandlingen av dine data</li>
              <li className="list-disc"><strong className="text-white">Innsigelse</strong> — protestere mot bestemte behandlinger</li>
            </ul>
            <p className="mt-3">
              Kontakt oss på{" "}
              <a href="mailto:support@intraa.net" className="text-indigo-400 transition-colors hover:underline">
                support@intraa.net
              </a>{" "}
              for å utøve disse rettighetene. Vi svarer innen 30 dager.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">9. Sletteperioder</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">Hvis du sletter kontoen din, fjernes profil, innlegg, meldinger og personlig informasjon umiddelbart</li>
              <li className="list-disc">Backups overskrives automatisk innen 30 dager</li>
              <li className="list-disc">Sikkerhetslogger (IP, innloggings-tidspunkt) slettes etter 90 dager</li>
              <li className="list-disc">Anonymiserte aktivitetsdata (community-statistikk) kan beholdes lenger</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">10. Aldersgrense</h2>
            <p>
              Intraa er ikke beregnet for barn under 13 år. Vi samler ikke bevisst inn
              data fra barn under 13. Hvis du er forelder/foresatt og mener vi har
              samlet inn data fra ditt barn, kontakt oss for sletting.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">11. Endringer i denne erklæringen</h2>
            <p>
              Vi kan oppdatere denne personvernerklæringen. Vesentlige endringer
              varsles via e-post eller på innloggings-skjermen.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-xs text-zinc-600">
          Les også våre{" "}
          <Link href="/terms" className="text-indigo-400 transition-colors hover:underline">
            vilkår for bruk
          </Link>
          {" "}· Spørsmål? Kontakt{" "}
          <a href="mailto:support@intraa.net" className="text-indigo-400 transition-colors hover:underline">
            support@intraa.net
          </a>
        </div>
      </div>
    </div>
  );
}
