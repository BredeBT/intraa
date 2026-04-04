"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type PlanId = "gratis" | "pro" | "vip";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  accent: string;
  border: string;
  button: string;
}

const PLANS: Plan[] = [
  {
    id: "gratis",
    name: "Gratis",
    price: "0",
    period: "kr / mnd",
    description: "Kom i gang og bli kjent med communityet.",
    features: [
      "Tilgang til offentlig feed",
      "Delta i diskusjoner",
      "Opptil 5 innlegg per dag",
      "Grunnleggende profil",
      "Delta i konkurranser",
    ],
    cta: "Nåværende plan",
    accent: "text-zinc-300",
    border: "border-zinc-800",
    button: "bg-zinc-800 text-zinc-400 cursor-default",
  },
  {
    id: "pro",
    name: "Pro",
    price: "99",
    period: "kr / mnd",
    description: "For aktive bidragsytere som vil mer.",
    features: [
      "Alt i Gratis",
      "Ubegrenset innlegg",
      "Pro-badge på profil",
      "Tidlig tilgang til konkurranser",
      "Direkte meldinger til alle",
      "Månedlig Q&A med moderatorer",
    ],
    cta: "Velg Pro",
    accent: "text-indigo-400",
    border: "border-indigo-500/30",
    button: "bg-indigo-600 text-white hover:bg-indigo-500",
  },
  {
    id: "vip",
    name: "VIP",
    price: "199",
    period: "kr / mnd",
    description: "Maksimal synlighet og eksklusiv tilgang.",
    popular: true,
    features: [
      "Alt i Pro",
      "VIP-badge og rolle",
      "Fremhevet på forsiden",
      "Topp 3 i søkeresultater",
      "Eksklusiv VIP-kanal",
      "Doble poeng på alle aktiviteter",
      "Prioritert støtte",
    ],
    cta: "Velg VIP",
    accent: "text-violet-400",
    border: "border-violet-500/40",
    button: "bg-violet-600 text-white hover:bg-violet-500",
  },
];

export default function AbonnementPage() {
  const [current, setCurrent] = useState<PlanId>("gratis");

  return (
    <div className="px-8 py-8">
      <h1 className="mb-2 text-xl font-semibold text-white">Abonnement</h1>
      <p className="mb-10 text-sm text-zinc-500">Velg planen som passer best for deg.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map(plan => {
          const isActive = current === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-zinc-900 p-6 transition-colors ${
                isActive ? `${plan.border} ring-1 ring-inset ${plan.border.replace("border-", "ring-")}` : plan.border
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    Mest populær
                  </span>
                </div>
              )}

              <div className="mb-5">
                <p className={`text-sm font-semibold uppercase tracking-widest ${plan.accent}`}>{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className="rounded-xl border border-zinc-700 py-2.5 text-center text-sm font-semibold text-zinc-400">
                  Aktiv plan
                </div>
              ) : (
                <button
                  onClick={() => setCurrent(plan.id)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${plan.button}`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Ingen bindingstid. Avbestill eller endre plan når som helst.
      </p>
    </div>
  );
}
