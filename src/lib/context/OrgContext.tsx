"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export type OrgType = "COMPANY" | "COMMUNITY";
export type OrgPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface Org {
  id:          string;
  name:        string;
  initials:    string;
  type:        OrgType;
  plan:        OrgPlan;
  accentColor: string;
}

interface OrgContextValue {
  org:    Org | null;
  setOrg: (org: Org) => void;
}

const FALLBACK: Org = {
  id:          "",
  name:        "…",
  initials:    "…",
  type:        "COMPANY",
  plan:        "FREE",
  accentColor: "#6366f1",
};

const OrgContext = createContext<OrgContextValue>({
  org:    FALLBACK,
  setOrg: () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [org, setOrg] = useState<Org | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/user/org")
      .then((r) => r.ok ? r.json() as Promise<Org> : Promise.reject())
      .then((data) => setOrg(data))
      .catch(() => setOrg(null));
  }, [status]);

  return (
    <OrgContext.Provider value={{ org, setOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext);
}
