import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let orgCount = 0, userCount = 0, messageCount = 0, postCount = 0;
  try {
    [orgCount, userCount, messageCount, postCount] = await Promise.all([
      db.organization.count({ where: { slug: { not: "intraa-support" } } }),
      db.user.count(),
      db.message.count(),
      db.post.count(),
    ]);
  } catch { /* DB utilgjengelig under bygg — vis fallback-tall */ }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-zinc-800/60 px-8 py-4">
        <span className="text-xl font-bold tracking-tight">Intraa</span>
        <div className="flex items-center gap-6">
          <Link href="#features" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">Funksjoner</Link>
          <Link href="#priser" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">Priser</Link>
          <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">Logg inn</Link>
          <Link href="/registrer" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
            Kom i gang
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-24 text-center">
<h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Din arbeidsplass.{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Ditt community.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Intraa samler intranet og creator community på én plattform. Kommuniser internt, håndter saker og bygg et engasjert fellesskap — alt på ett sted.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/registrer"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Opprett gratis konto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-5 text-xs text-zinc-600">Gratis å komme i gang · Ingen binding</p>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold text-white">{orgCount}+</p>
            <p className="text-sm text-zinc-400 mt-1">Organisasjoner</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">{userCount}+</p>
            <p className="text-sm text-zinc-400 mt-1">Unike medlemmer</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">{messageCount + postCount}+</p>
            <p className="text-sm text-zinc-400 mt-1">Innlegg og meldinger</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">99.9%</p>
            <p className="text-sm text-zinc-400 mt-1">Oppetid</p>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="features" className="border-t border-zinc-800/60 bg-zinc-900/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">Alt du trenger, på ett sted</h2>
            <p className="mt-3 text-zinc-400">Én plattform — to kraftige bruksområder.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-4xl mx-auto">
            {/* Bedrift/Intranett */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
              <p className="text-3xl mb-4">🏢</p>
              <h3 className="text-xl font-bold text-white mb-2">For bedrifter</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Moderne intranett som samler teamet ditt.
                Kommuniser internt, håndter saker og hold oversikt.
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>✓ Intern feed og chat</li>
                <li>✓ Ticket-system og helpdesk</li>
                <li>✓ Oppgaver og kalender</li>
                <li>✓ Fildeling</li>
                <li>✓ Rollestyring og tilganger</li>
              </ul>
            </div>

            {/* Community/Creator */}
            <div className="rounded-2xl border border-violet-800/50 bg-violet-950/20 p-8">
              <p className="text-3xl mb-4">🎮</p>
              <h3 className="text-xl font-bold text-white mb-2">For creators</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Bygg et engasjert community rundt din kanal.
                Live-integrasjon, spill og lojalitetssystem.
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>✓ Twitch/YouTube live-integrasjon</li>
                <li>✓ Coin-system og Fanpass</li>
                <li>✓ Idle clicker-spill</li>
                <li>✓ Konkurranser og rangering</li>
                <li>✓ Personlige profiler</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature packages */}
      <section id="priser" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Bygget for vekst</h2>
          <p className="text-zinc-400 text-lg">
            Én plattform som vokser med deg — fra oppstart til enterprise.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Kom i gang */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-4">Kom i gang</p>
            <h3 className="text-xl font-bold text-white mb-3">Gratis å prøve</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Opprett din konto og utforsk plattformen.
              Ingen kredittkort nødvendig.
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Personlig profil</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Bli med i communities</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Feed og chat</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Coin-system og spill</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Venner og meldinger</li>
            </ul>
          </div>

          {/* For creators */}
          <div className="rounded-2xl border border-violet-600/50 bg-violet-950/30 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Mest populær
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-4">For creators</p>
            <h3 className="text-xl font-bold text-white mb-3">Community-plattform</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Alt du trenger for å bygge et engasjert
              community rundt din kanal.
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Twitch/YouTube live-integrasjon</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Fanpass og coin shop</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Idle clicker og spill</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Konkurranser og rangering</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Lojalitetssystem</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Admin-panel og statistikk</li>
            </ul>
            <Link
              href="/registrer"
              className="mt-8 block w-full text-center bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Kom i gang gratis →
            </Link>
          </div>

          {/* For bedrifter */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">For bedrifter</p>
            <h3 className="text-xl font-bold text-white mb-3">Intranet-løsning</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Moderne intranet tilpasset din bedrift.
              Ta kontakt for et tilbud.
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Intern feed og chat</li>
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Helpdesk og ticket-system</li>
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Oppgaver og kalender</li>
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Fildeling</li>
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Rollestyring og tilganger</li>
              <li className="flex items-center gap-2"><span className="text-zinc-500">✓</span> Skreddersydd oppsett</li>
            </ul>
            <a
              href="mailto:hei@intraa.net"
              className="mt-8 block w-full text-center border border-zinc-700 hover:border-zinc-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ta kontakt →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-8 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <span className="text-lg font-bold text-white">Intraa</span>
            <p className="mt-1 text-xs text-zinc-600">Din arbeidsplass. Din community.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <Link href="#features"  className="transition-colors hover:text-white">Funksjoner</Link>
            <Link href="#priser"    className="transition-colors hover:text-white">Priser</Link>
            <Link href="/login"     className="transition-colors hover:text-white">Logg inn</Link>
            <Link href="/registrer" className="transition-colors hover:text-white">Registrer</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-700">© {new Date().getFullYear()} Intraa. Alle rettigheter forbeholdt.</p>
      </footer>
    </div>
  );
}
