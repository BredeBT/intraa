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
          <Link href="#priser"   className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">Priser</Link>
          <Link href="/login"    className="text-sm text-zinc-400 transition-colors hover:text-white">Logg inn</Link>
          <Link
            href="/registrer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Kom i gang
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-24 text-center">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Bygg ditt{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            creator community.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Intraa gir deg alt du trenger for å samle fansen din på ett sted — live-integrasjon, spill, Fanpass og mye mer.
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
            <p className="text-sm text-zinc-400 mt-1">Communities</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">{userCount}+</p>
            <p className="text-sm text-zinc-400 mt-1">Medlemmer</p>
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

      {/* Features */}
      <section id="features" className="border-t border-zinc-800/60 bg-zinc-900/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">Alt du trenger, på ett sted</h2>
            <p className="mt-3 text-zinc-400">En komplett plattform for creators og deres community.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-violet-800/40 bg-violet-950/20 p-6">
              <p className="text-2xl mb-3">📺</p>
              <h3 className="text-base font-bold text-white mb-2">Live-integrasjon</h3>
              <p className="text-zinc-400 text-sm">Koble til Twitch eller YouTube. Fansen ser når du er live direkte i appen.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-2xl mb-3">💬</p>
              <h3 className="text-base font-bold text-white mb-2">Community-chat og feed</h3>
              <p className="text-zinc-400 text-sm">Sanntids-chat, tråder og en feed der fansen kan dele og kommentere.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-2xl mb-3">🎮</p>
              <h3 className="text-base font-bold text-white mb-2">Spill og minigames</h3>
              <p className="text-zinc-400 text-sm">Sjakk, Wordle, 2048 og idle clicker med coin-belønninger for engasjement.</p>
            </div>
            <div className="rounded-2xl border border-violet-800/40 bg-violet-950/20 p-6">
              <p className="text-2xl mb-3">♛</p>
              <h3 className="text-base font-bold text-white mb-2">Fanpass</h3>
              <p className="text-zinc-400 text-sm">Eksklusivt medlemskap med synlige fordeler, badges og premium funksjoner.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-2xl mb-3">🪙</p>
              <h3 className="text-base font-bold text-white mb-2">Coin-system</h3>
              <p className="text-zinc-400 text-sm">Fansen tjener coins ved å delta. De kan brukes i shop og belønninger.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="text-2xl mb-3">🏆</p>
              <h3 className="text-base font-bold text-white mb-2">Rangeringer og stats</h3>
              <p className="text-zinc-400 text-sm">Leaderboards, Elo-rating i sjakk og aktivitetsstatistikk for hver bruker.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Enkelt og gratis å starte</h2>
          <p className="text-zinc-400 text-lg">
            Kom i gang uten kredittkort. Oppgrader når du er klar.
          </p>
        </div>

        <div className="max-w-2xl mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Free */}
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

          {/* Creator plan */}
          <div className="rounded-2xl border border-violet-600/50 bg-violet-950/30 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              For creators
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-4">Community-plattform</p>
            <h3 className="text-xl font-bold text-white mb-3">Eget community</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Alt du trenger for å bygge et engasjert
              community rundt din kanal.
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Twitch/YouTube live-integrasjon</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Fanpass og coin shop</li>
              <li className="flex items-center gap-2"><span className="text-violet-400">✓</span> Spill og minigames</li>
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-8 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <span className="text-lg font-bold text-white">Intraa</span>
            <p className="mt-1 text-xs text-zinc-600">Din community-plattform.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <Link href="#features"  className="transition-colors hover:text-white">Funksjoner</Link>
            <Link href="#priser"    className="transition-colors hover:text-white">Priser</Link>
            <Link href="/login"     className="transition-colors hover:text-white">Logg inn</Link>
            <Link href="/registrer" className="transition-colors hover:text-white">Registrer</Link>
            <Link href="/terms"     className="transition-colors hover:text-white">Vilkår</Link>
            <Link href="/privacy"   className="transition-colors hover:text-white">Personvern</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-700">© {new Date().getFullYear()} Intraa. Alle rettigheter forbeholdt.</p>
      </footer>
    </div>
  );
}
