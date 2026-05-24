"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
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

export interface TenantTheme {
  logoUrl:        string | null;
  bannerUrl?:     string | null;
  bannerPreset?:  string | null;
  avatarPreset?:  string | null;
  borderRadius?:  string;
  fontStyle?:     string;
  welcomeMessage?: string;
}

interface InitResponse {
  org:      Org | null;
  allOrgs:  Org[];
  features: string[];
  theme:    TenantTheme | null;
  unread:   number;
}

interface OrgContextValue {
  org:             Org | null;
  allOrgs:         Org[];
  features:        string[] | null;   // null = loading
  theme:           TenantTheme | null;
  unreadCount:     number;
  orgLoaded:       boolean;
  setOrg:          (org: Org) => void;
  setUnreadCount:  (count: number) => void;
  refreshUnread:   () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue>({
  org:            null,
  allOrgs:        [],
  features:       null,
  theme:          null,
  unreadCount:    0,
  orgLoaded:      false,
  setOrg:         () => {},
  setUnreadCount: () => {},
  refreshUnread:  async () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [org,         setOrg]         = useState<Org | null>(null);
  const [allOrgs,     setAllOrgs]     = useState<Org[]>([]);
  const [features,    setFeatures]    = useState<string[] | null>(null);
  const [theme,       setTheme]       = useState<TenantTheme | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgLoaded,   setOrgLoaded]   = useState(false);

  // Initial bundlet fetch på auth — én roundtrip henter org, allOrgs,
  // features, theme og unread. Erstatter 4 separate kall som tidligere
  // gjorde sidebaren blank i 100-500 ms ved kald nav.
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/layout/init")
      .then((r) => r.ok ? r.json() as Promise<InitResponse> : Promise.reject())
      .then((data) => {
        setOrg(data.org);
        setAllOrgs(data.allOrgs);
        setFeatures(data.features);
        setTheme(data.theme);
        setUnreadCount(data.unread);
        setOrgLoaded(true);
      })
      .catch(() => { setOrg(null); setOrgLoaded(true); });
  }, [status]);

  // Når brukeren bytter org eksternt (bytt-org/page), re-hent features+theme
  // for den nye orgen. Hopper over første runde — init-callen dekker det.
  const setOrgAndRefresh = useCallback((newOrg: Org) => {
    setOrg(newOrg);
    setFeatures(null); // clear stale features umiddelbart
    fetch("/api/layout/bootstrap")
      .then((r) => r.ok ? r.json() as Promise<{ features: string[]; theme: TenantTheme | null }> : Promise.reject())
      .then((data) => {
        setFeatures(data.features);
        if (data.theme) setTheme(data.theme);
      })
      .catch(() => setFeatures([]));
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/user/unread");
      if (!r.ok) return;
      const d = await r.json() as { total: number };
      setUnreadCount(d.total);
    } catch { /* polling — ignorer feil */ }
  }, []);

  return (
    <OrgContext.Provider
      value={{
        org,
        allOrgs,
        features,
        theme,
        unreadCount,
        orgLoaded,
        setOrg:         setOrgAndRefresh,
        setUnreadCount,
        refreshUnread,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext);
}
