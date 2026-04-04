"use client";

import { createContext, useContext, useState } from "react";

export type OrgType = "COMPANY" | "COMMUNITY";
export type OrgPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface Org {
  id: string;
  name: string;
  initials: string;
  type: OrgType;
  plan: OrgPlan;
  accentColor: string;
}

interface OrgContextValue {
  org: Org;
  setOrg: (org: Org) => void;
}

const MOCK_ORGS: Org[] = [
  { id: "1", name: "Intraa Demo",     initials: "ID", type: "COMPANY",   plan: "PRO",        accentColor: "#6366f1" },
  { id: "2", name: "Designerklubben", initials: "DK", type: "COMMUNITY", plan: "STARTER",    accentColor: "#8b5cf6" },
  { id: "3", name: "Acme AS",         initials: "AC", type: "COMPANY",   plan: "ENTERPRISE", accentColor: "#0ea5e9" },
];

export { MOCK_ORGS };

const OrgContext = createContext<OrgContextValue>({
  org: MOCK_ORGS[0],
  setOrg: () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<Org>(MOCK_ORGS[0]);
  return <OrgContext.Provider value={{ org, setOrg }}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext);
}
