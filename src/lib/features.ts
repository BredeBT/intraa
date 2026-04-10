export const FEATURES = {
  FEED:                   "feed",
  CHAT:                   "chat",
  TICKETS:                "tickets",
  CALENDAR:               "calendar",
  TASKS:                  "tasks",
  FILES:                  "files",
  MEMBERS:                "members",
  LIVE:                   "live",
  COMMUNITY_FEED:         "community_feed",
  COMMUNITY_MEMBERS:      "community_members",
  COMMUNITY_LEADERBOARD:  "community_leaderboard",
  COMMUNITY_CONTESTS:     "community_contests",
  COMMUNITY_LOYALTY:      "community_loyalty",
  COMMUNITY_CHAT:         "community_chat",
  COMMUNITY_SUBSCRIPTION: "community_subscription",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

export const COMPANY_FEATURES: Feature[] = [
  "feed", "chat", "tickets", "calendar", "tasks", "files", "members", "live",
];

export const COMMUNITY_FEATURES: Feature[] = [
  "community_feed", "community_members", "community_leaderboard",
  "community_contests", "community_loyalty", "community_chat", "community_subscription",
];

export const FEATURE_LABELS: Record<Feature, string> = {
  feed:                   "Feed",
  chat:                   "Chat",
  tickets:                "Tickets",
  calendar:               "Kalender",
  tasks:                  "Oppgaver",
  files:                  "Filer",
  members:                "Medlemmer",
  live:                   "Live Stream",
  community_feed:         "Feed",
  community_members:      "Medlemmer",
  community_leaderboard:  "Rangering",
  community_contests:     "Konkurranser",
  community_loyalty:      "Lojalitet",
  community_chat:         "Chat",
  community_subscription: "Abonnement",
};

export const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  feed:                   "Nyhetsstrøm med innlegg og kommentarer",
  chat:                   "Sanntidsmeldinger og direktemeldinger",
  tickets:                "Supportsaker og oppgavehåndtering",
  calendar:               "Kalender og hendelsesplanlegging",
  tasks:                  "Oppgaveliste og prosjektstyring",
  files:                  "Fildeling og dokumentlagring",
  members:                "Medlemsoversikt og rollestyring",
  live:                   "Twitch/YouTube stream-integrasjon med live-indikator i sidebar",
  community_feed:         "Nyhetsstrøm for community",
  community_members:      "Oversikt over community-medlemmer",
  community_leaderboard:  "Poeng- og rangeringsliste",
  community_contests:     "Konkurranser og utfordringer",
  community_loyalty:      "Lojalitetsprogram og belønninger",
  community_chat:         "Chat for community-medlemmer",
  community_subscription: "Abonnementshåndtering og betalingsplaner",
};

export const FEATURE_GROUPS: { label: string; features: Feature[] }[] = [
  {
    label:    "Kommunikasjon",
    features: ["feed", "chat", "community_feed", "community_chat"],
  },
  {
    label:    "Produktivitet",
    features: ["tickets", "calendar", "tasks", "files", "members"],
  },
  {
    label:    "Integrasjoner",
    features: ["live"],
  },
  {
    label:    "Community",
    features: ["community_members", "community_leaderboard", "community_contests", "community_loyalty", "community_subscription"],
  },
];
