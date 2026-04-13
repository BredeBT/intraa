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
        <p className="mb-10 text-sm text-zinc-500">Sist oppdatert: April 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          <p>
            Intraa er en plattform for communities og bedrifter. Ved å opprette en konto godtar du disse vilkårene.
          </p>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Bruk av tjenesten</h2>
            <p>
              Du må være minst 13 år for å bruke Intraa. Du er ansvarlig for all aktivitet på din konto.
              Du skal ikke misbruke tjenesten, spre ulovlig innhold, trakassere andre brukere eller forsøke å omgå sikkerhetssystemer.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Innhold</h2>
            <p>
              Du beholder rettighetene til innhold du publiserer. Ved å publisere gir du Intraa tillatelse til å vise
              innholdet på plattformen. Vi forbeholder oss retten til å fjerne innhold som bryter med våre retningslinjer.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Betaling</h2>
            <p>
              Fanpass koster 59 kr/mnd og kan kanselleres når som helst. Betaling håndteres via Stripe.
              Vi refunderer ikke påbegynte perioder.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Ansvarsbegrensning</h2>
            <p>
              Intraa leveres «som det er». Vi er ikke ansvarlige for tap av data eller indirekte skader.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Endringer</h2>
            <p>
              Vi kan oppdatere disse vilkårene. Vesentlige endringer varsles via e-post.
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
