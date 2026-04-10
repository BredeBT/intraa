"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Building2, Globe, ArrowLeft } from "lucide-react";
import { useOrg, type Org } from "@/lib/context/OrgContext";

const PLAN_LABEL: Record<string, string> = {
  FREE: "Gratis", STARTER: "Starter", PRO: "Pro", ENTERPRISE: "Enterprise",
};
const PLAN_STYLE: Record<string, string> = {
  FREE:       "bg-zinc-700/50 text-zinc-400",
  STARTER:    "bg-blue-500/10 text-blue-400",
  PRO:        "bg-indigo-500/10 text-indigo-400",
  ENTERPRISE: "bg-amber-500/10 text-amber-400",
};

export default function ByttOrgPage() {
  const { org, setOrg } = useOrg();
  const router          = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    fetch("/api/user/orgs")
      .then((r) => r.ok ? r.json() as Promise<Org[]> : Promise.reject())
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  async function select(selected: Org) {
    // Set persistent cookie via PATCH — server validates membership
    await fetch("/api/user/org", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slug: selected.slug }),
    });
    setOrg(selected);
    router.push("/feed");
  }

  return (
    <div className="animate-page mx-auto max-w-md px-6 py-8">
      <button
        onClick={() => router.back()}
        className="btn-press mb-6 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake
      </button>

      <h1 className="mb-2 text-xl font-semibold text-white">Bytt organisasjon</h1>
      <p className="mb-8 text-sm text-zinc-500">Velg hvilken organisasjon du vil jobbe i.</p>

      <div className="flex flex-col gap-3">
        {orgs.length === 0 && (
          <p className="text-sm text-zinc-600">Ingen organisasjoner funnet.</p>
        )}
        {orgs.map((o) => {
          const isActive = o.id === org?.id;
          const Icon     = o.type === "COMMUNITY" ? Globe : Building2;
          return (
            <button
              key={o.id}
              onClick={() => select(o)}
              className={`card-lift flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                isActive
                  ? "border-transparent ring-2"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
              style={isActive ? { borderColor: "transparent", boxShadow: `0 0 0 2px ${o.accentColor}55`, backgroundColor: `${o.accentColor}0d` } : {}}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: o.accentColor }}
              >
                {o.initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{o.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STYLE[o.plan]}`}>
                    {PLAN_LABEL[o.plan]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {o.type === "COMMUNITY" ? "Community" : "Bedrift"}
                </div>
              </div>

              {isActive && (
                <Check className="h-5 w-5 shrink-0" style={{ color: o.accentColor }} />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
