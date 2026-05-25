import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Vilkår for bruk — Intraa",
};

export default function TermsPage() {
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

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Vilkår for bruk</h1>
        <p className="mb-10 text-sm text-zinc-500">Sist oppdatert: Mai 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          <p>
            Intraa er en plattform for communities og creators. Ved å opprette en
            konto eller laste ned mobilappen vår godtar du disse vilkårene.
          </p>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">1. Hvem kan bruke tjenesten</h2>
            <p>
              Du må være minst 13 år for å bruke Intraa. Er du under 16 år, må
              foresatte godkjenne. Du er ansvarlig for all aktivitet på din konto
              og for å holde innloggingsinformasjonen din sikker. Vi anbefaler
              sterkt å aktivere to-faktor-autentisering.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. Akseptabel bruk</h2>
            <p>Du skal ikke:</p>
            <ul className="mt-2 space-y-1.5 pl-4">
              <li className="list-disc">Spre ulovlig, hatefullt, truende eller diskriminerende innhold</li>
              <li className="list-disc">Trakassere, mobbe, dox'e eller utgi deg for å være andre</li>
              <li className="list-disc">Spre virus, malware eller forsøke å omgå sikkerhetssystemer</li>
              <li className="list-disc">Skrape data eller bruke automatiserte verktøy uten skriftlig samtykke</li>
              <li className="list-disc">Misbruke spam-funksjoner, coin-økonomien eller stemmesystemer (giveaways/polls)</li>
              <li className="list-disc">Selge eller overdra kontoen din uten skriftlig tillatelse</li>
            </ul>
            <p className="mt-3">
              Brudd kan føre til midlertidig suspendering eller permanent stenging
              uten forhåndsvarsel.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. Ditt innhold</h2>
            <p>
              Du beholder alle rettighetene til innhold du publiserer (innlegg,
              meldinger, bilder). Ved å publisere gir du Intraa en ikke-eksklusiv,
              royalty-fri lisens til å vise innholdet på plattformen og levere
              tjenesten til andre medlemmer.
            </p>
            <p className="mt-3">
              Vi forbeholder oss retten til å fjerne innhold som bryter retningslinjene,
              med eller uten varsel. Innhold rapportert av andre brukere gjennomgås
              manuelt.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Creator-innhold og communities</h2>
            <p>
              Creators som driver communities har eget ansvar for sin modering. Intraa
              kan gripe inn ved klare brudd på retningslinjene, men er ikke
              ansvarlig for hvert innlegg eller hver melding postet av brukere.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. Fanpass og betaling</h2>
            <p>
              Fanpass er et månedlig abonnement (foreløpig kun planlagt, ikke aktivert)
              som gir tilgang til eksklusive kanaler og innhold i communities som
              krever det. Betaling vil håndteres via Stripe (web) eller via Apple
              IAP / Google Play Billing (mobilapp), avhengig av plattform du
              kjøper på.
            </p>
            <ul className="mt-3 space-y-1.5 pl-4">
              <li className="list-disc">Abonnementet kan kanselleres når som helst</li>
              <li className="list-disc">Påbegynte perioder refunderes ikke</li>
              <li className="list-disc">Pris og betingelser kan endres med 30 dagers varsel</li>
              <li className="list-disc">Apple/Google sine vilkår for in-app-kjøp gjelder for kjøp gjort i mobilappen</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. Coins og virtuelle gjenstander</h2>
            <p>
              Coins, badges, name colors og andre virtuelle gjenstander har ingen
              kontantverdi og kan ikke veksles inn til ekte penger eller overføres
              mellom kontoer. De er kun gyldige innenfor Intraa-plattformen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Avslutning av konto</h2>
            <p>
              Du kan slette kontoen din når som helst i Innstillinger →
              Konto. Vi kan stenge en konto som bryter disse vilkårene. Ved
              avslutning fjernes personlig data — se{" "}
              <Link href="/privacy" className="text-indigo-400 hover:underline">
                personvernerklæringen
              </Link>{" "}
              for detaljer om sletteperioder.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">8. Ansvarsbegrensning</h2>
            <p>
              Intraa leveres «som det er», uten garanti for tilgjengelighet eller
              feilfri drift. Vi er ikke ansvarlige for tap av data, indirekte
              skader eller skader forårsaket av tredjeparts-tjenester (Twitch,
              YouTube, Stripe etc).
            </p>
            <p className="mt-3">
              Vårt samlede erstatningsansvar er begrenset til beløpet du har
              betalt oss de siste 12 månedene.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">9. Endringer i vilkårene</h2>
            <p>
              Vi kan oppdatere disse vilkårene. Vesentlige endringer varsles via
              e-post eller på innloggings-skjermen minst 14 dager før de trer i
              kraft. Fortsetter du å bruke tjenesten etter dette regnes det som
              aksept.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">10. Lov og jurisdiksjon</h2>
            <p>
              Disse vilkårene reguleres av norsk lov. Tvister skal forsøkes løst i
              minnelighet. Forbrukerklager kan rettes til Forbrukertilsynet.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-xs text-zinc-600">
          Les også vår{" "}
          <Link href="/privacy" className="text-indigo-400 transition-colors hover:underline">
            personvernerklæring
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
