"use client";

import { useState } from "react";
import { ChevronDown, BookOpen, ExternalLink, Send, Check } from "lucide-react";

const FAQS = [
  {
    q: "Hvordan inviterer jeg nye brukere til organisasjonen?",
    a: "Gå til Admin → Brukere og klikk «Inviter bruker». Skriv inn e-postadressen og velg rolle. Brukeren mottar en e-postinvitasjon med en lenke som er gyldig i 48 timer.",
  },
  {
    q: "Hva er forskjellen på Intranet og Community?",
    a: "Intranettet er ditt private arbeidsverktøy — feed, chat, tickets og filer er kun tilgjengelig for organisasjonens medlemmer. Community er åpent for alle som abonnerer og er beregnet for creator-fellesskap og offentlig engasjement.",
  },
  {
    q: "Hvordan tilbakestiller jeg passordet mitt?",
    a: "Gå til innloggingssiden og klikk «Glemt passord?». Skriv inn e-postadressen din, så sender vi en tilbakestillingslenke. Lenken er gyldig i 30 minutter. Sjekk spam-mappen hvis e-posten ikke dukker opp.",
  },
  {
    q: "Kan jeg laste opp store filer?",
    a: "Gratis-planen støtter filer opptil 50 MB. Pro-planen tillater opptil 500 MB per fil og 50 GB totalt lagringsplass. Enterprise-planen har ubegrenset lagring. Støttede filtyper: bilder, PDF, Word, Excel, ZIP og de fleste vanlige formater.",
  },
  {
    q: "Hvordan setter jeg opp VIP-tilgang i Community?",
    a: "Gå til Community → Admin og velg «Abonnementsplaner». Her kan du opprette VIP-nivåer med tilhørende pris og fordeler. Brukere kan deretter oppgradere fra Community → Abonnement-siden.",
  },
  {
    q: "Er dataene mine sikre?",
    a: "Ja. All data er kryptert i overføring (TLS 1.3) og i hvile (AES-256). Vi bruker Supabase (PostgreSQL) med daglig backup og Cloudflare R2 for fillagring. Vi selger aldri data til tredjeparter.",
  },
];

const DOCS = [
  { label: "Kom i gang-guide",      desc: "Sett opp organisasjonen din på under 10 minutter" },
  { label: "Admin-dokumentasjon",   desc: "Brukeradministrasjon, roller og tilganger" },
  { label: "Community-guide",       desc: "Bygg og veks ditt creator-community" },
  { label: "API-referanse",         desc: "Integrer Intraa med dine egne verktøy" },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-zinc-800 last:border-0`}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-900"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed text-zinc-400">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HjelpPage() {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setForm({ subject: "", message: "" });
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="animate-page mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-white">Hjelp & Support</h1>
      <p className="mb-10 text-sm text-zinc-500">Finn svar på vanlige spørsmål eller kontakt oss direkte.</p>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Vanlige spørsmål</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {FAQS.map(faq => <AccordionItem key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </section>

      {/* Docs */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Dokumentasjon</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCS.map(doc => (
            <div
              key={doc.label}
              className="card-lift flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 cursor-pointer"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                <BookOpen className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white">{doc.label}</p>
                  <ExternalLink className="h-3 w-3 text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500">{doc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact form */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Kontakt support</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-white">Melding sendt!</p>
              <p className="text-sm text-zinc-500">Vi svarer normalt innen én arbeidsdag.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Emne</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Hva gjelder henvendelsen?"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Melding</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Beskriv problemet eller spørsmålet ditt..."
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={!form.subject.trim() || !form.message.trim()}
                className="btn-press flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" /> Send melding
              </button>
            </form>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-zinc-600">
          Haster det?{" "}
          <a href="mailto:hei@intraa.no" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            hei@intraa.no
          </a>
        </p>
      </section>
    </div>
  );
}
