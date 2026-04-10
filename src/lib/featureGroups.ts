// Single source of truth for superadmin feature groups.
// Keys MUST match the feature keys used in layout.tsx sidebar nav links.
// Import this in BOTH funksjoner/page.tsx and FeatureToggles.tsx
// to avoid hydration mismatches from duplicate inline definitions.

export const SUPERADMIN_FEATURE_GROUPS = [
  {
    label: "Bedrift-features",
    desc:  "For bedrifter og intranet (org-type: Bedrift)",
    features: [
      { key: "feed",     label: "Feed",       desc: "Nyhetsstrøm med innlegg og kommentarer" },
      { key: "chat",     label: "Chat",       desc: "Sanntidsmeldinger og direktemeldinger" },
      { key: "members",  label: "Medlemmer",  desc: "Medlemsoversikt og rollestyring" },
      { key: "tickets",  label: "Tickets",    desc: "Supportsaker og helpdesk" },
      { key: "calendar", label: "Kalender",   desc: "Kalender og hendelsesplanlegging" },
      { key: "tasks",    label: "Oppgaver",   desc: "Oppgaveliste og prosjektstyring (Kanban)" },
      { key: "files",    label: "Filer",      desc: "Fildeling og dokumentlagring" },
      { key: "live",     label: "Live Stream", desc: "Twitch/YouTube stream-integrasjon med live-indikator" },
    ],
  },
  {
    label: "Community-features",
    desc:  "For creators, streamere og communities (org-type: Community)",
    features: [
      { key: "community_feed",         label: "Feed",         desc: "Nyhetsstrøm for community" },
      { key: "community_chat",         label: "Chat",         desc: "Chat for community-medlemmer" },
      { key: "community_members",      label: "Medlemmer",    desc: "Oversikt over community-medlemmer" },
      { key: "community_leaderboard",  label: "Rangering",    desc: "Poeng- og rangeringsliste" },
      { key: "community_contests",     label: "Konkurranser", desc: "Konkurranser og utfordringer" },
      { key: "community_loyalty",      label: "Lojalitet",    desc: "Lojalitetsprogram og belønninger" },
      { key: "community_subscription", label: "Abonnement",   desc: "Abonnementshåndtering og betalingsplaner" },
    ],
  },
] as const;

export type SuperadminFeatureGroup = (typeof SUPERADMIN_FEATURE_GROUPS)[number];
