"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export type OrgType = "COMPANY" | "COMMUNITY";
export type OrgPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export type OrgRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

export interface Org {
  id:          string;
  slug:        string;
  name:        string;
  initials:    string;
  type:        OrgType;
  plan:        OrgPlan;
  accentColor: string;
  userRole:    OrgRole;
}

interface OrgContextValue {
  org:       Org | null;
  setOrg:    (org: Org) => void;
  /** true once the initial /api/user/org fetch has completed (success or 404) */
  orgLoaded: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  org:       null,
  setOrg:    () => {},
  orgLoaded: false,
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [org,       setOrg]       = useState<Org | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/user/org")
      .then((r) => r.ok ? r.json() as Promise<Org> : Promise.reject())
      .then((data) => { setOrg(data); setOrgLoaded(true); })
      .catch(() => { setOrg(null); setOrgLoaded(true); });
  }, [status]);

  return (
    <OrgContext.Provider value={{ org, setOrg, orgLoaded }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext);
}
