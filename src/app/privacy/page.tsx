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
        <p className="mb-10 text-sm text-zinc-500">Sist oppdatert: April 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Data vi samler inn</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">Navn, e-postadresse og passord ved registrering</li>
              <li className="list-disc">Innhold du publiserer (innlegg, meldinger, kommentarer)</li>
              <li className="list-disc">Aktivitetsdata (innlogginger, klikk i spill, coins)</li>
              <li className="list-disc">Teknisk informasjon (nettlesertype, IP-adresse ved innlogging)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Cookies</h2>
            <p>
              Vi bruker én session-cookie (NextAuth JWT) for innlogging. Vi bruker ingen tredjeparts
              sporings-cookies eller reklame-cookies. Intraa-produkter er reklamefrie.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Hvordan vi bruker data</h2>
            <ul className="space-y-1.5 pl-4">
              <li className="list-disc">For å levere og forbedre tjenesten</li>
              <li className="list-disc">For å sende varsler du har bedt om</li>
              <li className="list-disc">Vi selger aldri data til tredjeparter</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Datalagring</h2>
            <p>
              Data lagres på Supabase sine servere i Frankfurt, EU (GDPR-kompatibelt).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Dine rettigheter</h2>
            <p>
              Du kan be om innsyn i, retting av eller sletting av dine data ved å kontakte oss på{" "}
              <a href="mailto:support@intraa.net" className="text-indigo-400 transition-colors hover:underline">
                support@intraa.net
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">Tredjeparter</h2>
            <p>
              Vi bruker Supabase (database), Vercel (hosting) og Stripe (betaling, når aktivert).
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
