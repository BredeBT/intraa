import Link from "next/link";
import {
  Rss, MessageSquare, Ticket, Folder, Users, Star,
  Check, ArrowRight, Globe,
} from "lucide-react";

const FEATURES = [
  { icon: Rss,           title: "Feed",       desc: "Del oppdateringer, nyheter og innlegg internt i organisasjonen." },
  { icon: MessageSquare, title: "Chat",        desc: "Sanntidsmeldinger i kanaler og direktemeldinger til kolleger." },
  { icon: Ticket,        title: "Tickets",     desc: "IT- og HR-saker håndteres effektivt med status og tildeling." },
  { icon: Folder,        title: "Filer",       desc: "Samlet filbibliotek med mappestruktur og enkel opplasting." },
  { icon: Users,         title: "Community",   desc: "Bygg et fagfellesskap med rangering, konkurranser og roller." },
  { icon: Star,          title: "Lojalitet",   desc: "Belønn aktive bidragsytere med poeng, nivåer og badges." },
];

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "299",
    period: "kr / mnd",
    desc: "Perfekt for små team som vil komme i gang.",
    features: [
      "Opptil 10 brukere",
      "Feed, Chat og Tickets",
      "5 GB fillagring",
      "E-poststøtte",
    ],
    cta: "Start gratis i 14 dager",
    highlight: false,
  },
  {
    name: "Pro",
    price: "799",
    period: "kr / mnd",
    desc: "For voksende organisasjoner med mer behov.",
    features: [
      "Opptil 50 brukere",
      "Alle funksjoner",
      "50 GB fillagring",
      "Community-modul",
      "Prioritert støtte",
      "Avansert admin-panel",
    ],
    cta: "Prøv Pro gratis",
    highlight: true,
    badge: "Mest populær",
  },
  {
    name: "Enterprise",
    price: "Ta kontakt",
    period: "",
    desc: "Skreddersydde løsninger for store virksomheter.",
    features: [
      "Ubegrenset brukere",
      "Alt i Pro",
      "Ubegrenset lagring",
      "SSO / SAML",
      "SLA-avtale",
      "Dedikert kundekontakt",
    ],
    cta: "Kontakt oss",
    highlight: false,
  },
];

export default function Home() {
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
        <div className="mb-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400">
          Nå i beta — gratis for de første 100 organisasjonene
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Din arbeidsplass.{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Din community.
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
          <Link
            href="/community/feed"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
          >
            <Globe className="h-4 w-4" /> Se community-demo
          </Link>
        </div>
        <p className="mt-5 text-xs text-zinc-600">Ingen kredittkort nødvendig · Gratis i 14 dager</p>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-800/60 bg-zinc-900/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">Alt du trenger, på ett sted</h2>
            <p className="mt-3 text-zinc-400">Seks kjernemoduler bygget for moderne organisasjoner og communities.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700">
                <div className="mb-4 inline-flex rounded-xl bg-indigo-500/10 p-3">
                  <Icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">Enkle, transparente priser</h2>
            <p className="mt-3 text-zinc-400">Velg planen som passer din organisasjon. Ingen skjulte kostnader.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">{plan.name}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  {plan.period ? (
                    <>
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-sm text-zinc-500">{plan.period}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.desc}</p>
                <ul className="my-6 flex flex-1 flex-col gap-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "mailto:hei@intraa.no" : "/registrer"}
                  className={`block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
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
            <Link href="#features" className="transition-colors hover:text-white">Funksjoner</Link>
            <Link href="#priser"   className="transition-colors hover:text-white">Priser</Link>
            <Link href="/login"    className="transition-colors hover:text-white">Logg inn</Link>
            <Link href="/registrer"className="transition-colors hover:text-white">Registrer</Link>
            <Link href="/feed"     className="transition-colors hover:text-white">Intranet</Link>
            <Link href="/community/feed" className="transition-colors hover:text-white">Community</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-700">© {new Date().getFullYear()} Intraa. Alle rettigheter forbeholdt.</p>
      </footer>
    </div>
  );
}
