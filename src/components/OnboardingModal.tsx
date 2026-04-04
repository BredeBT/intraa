"use client";

import { useEffect, useState } from "react";
import { Building2, Globe, Users, ArrowRight, X, Check } from "lucide-react";

type UseCase = "bedrift" | "community" | "begge" | null;

const STORAGE_KEY = "intraa-onboarding-done";

export default function OnboardingModal() {
  const [show, setShow]       = useState(false);
  const [step, setStep]       = useState(0);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [emails, setEmails]   = useState("");
  const [done, setDone]       = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDone(true);
    setTimeout(() => setShow(false), 600);
  }

  if (!show) return null;

  const USE_CASES = [
    { id: "bedrift",   label: "Bedrift",         desc: "Intranet for teamet mitt",      icon: Building2, color: "indigo" },
    { id: "community", label: "Creator community",desc: "Fellesskap for abonnentene mine",icon: Globe,      color: "violet" },
    { id: "begge",     label: "Begge deler",      desc: "Intranet + community",          icon: Users,      color: "emerald" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step === 0 ? finish : undefined} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-500 ${
          done ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Close */}
        <button
          onClick={finish}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-indigo-500" : i < step ? "w-3 bg-indigo-500/50" : "w-3 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white shadow-lg">
                I
              </div>
              <h2 className="mb-3 text-xl font-bold text-white">Velkommen til Intraa!</h2>
              <p className="mb-2 text-sm leading-relaxed text-zinc-400">
                Intraa samler intranet og creator community på én plattform. La oss sette opp arbeidsplassen din på under ett minutt.
              </p>
              <ul className="mb-8 mt-4 flex flex-col gap-2 text-left">
                {["Kommuniser internt med feed og chat", "Håndter saker med tickets", "Bygg et engasjert community"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setStep(1)}
                className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Kom i gang <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Use case */}
          {step === 1 && (
            <div>
              <h2 className="mb-1 text-lg font-bold text-white">Hva vil du bruke Intraa til?</h2>
              <p className="mb-6 text-sm text-zinc-400">Vi tilpasser opplevelsen basert på ditt valg.</p>
              <div className="flex flex-col gap-3">
                {USE_CASES.map(({ id, label, desc, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setUseCase(id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                      useCase === id
                        ? "border-indigo-500/60 bg-indigo-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      useCase === id ? "bg-indigo-500/20" : "bg-zinc-700"
                    }`}>
                      <Icon className={`h-4 w-4 ${useCase === id ? "text-indigo-400" : "text-zinc-400"}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${useCase === id ? "text-indigo-300" : "text-white"}`}>{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                    {useCase === id && <Check className="h-4 w-4 shrink-0 text-indigo-400" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!useCase}
                className="btn-press mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Neste <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Invite */}
          {step === 2 && (
            <div>
              <h2 className="mb-1 text-lg font-bold text-white">Inviter kolleger</h2>
              <p className="mb-6 text-sm text-zinc-400">
                Send en invitasjon til teamet ditt. Du kan alltid gjøre dette senere under Admin.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  E-postadresser (kommaseparert)
                </label>
                <textarea
                  rows={3}
                  value={emails}
                  onChange={e => setEmails(e.target.value)}
                  placeholder="ola@firma.no, kari@firma.no"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={finish}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {emails.trim() ? "Send invitasjoner og fullfør" : "Fullfør oppsett"}
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={finish}
                  className="w-full rounded-xl py-2.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Hopp over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
