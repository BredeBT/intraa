export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchSection {
  key: string;
  label: string;
  results: SearchResult[];
}

const ALL_RESULTS: SearchSection[] = [
  {
    key: "innlegg",
    label: "Innlegg",
    results: [
      { id: "p1", title: "Ny onboarding-prosess lansert", subtitle: "Anders Sørensen · 2 timer siden", href: "/feed" },
      { id: "p2", title: "Påminnelse: Allmøte fredag kl. 10:00", subtitle: "Maria Haugen · 4 timer siden", href: "/feed" },
      { id: "p3", title: "Notater fra designworkshopen", subtitle: "Thomas Kvam · I går", href: "/feed" },
    ],
  },
  {
    key: "meldinger",
    label: "Meldinger",
    results: [
      { id: "m1", title: "Kodefrys fra torsdag denne uken", subtitle: "#general · Maria Haugen", href: "/chat" },
      { id: "m2", title: "Standup er som vanlig kl. 09:00", subtitle: "#general · Anders Sørensen", href: "/chat" },
    ],
  },
  {
    key: "tickets",
    label: "Tickets",
    results: [
      { id: "t1", title: "Kan ikke logge inn på Teams", subtitle: "IT · Åpen · Thomas Kvam", href: "/tickets" },
      { id: "t2", title: "Oppdater ansattkontrakt", subtitle: "HR · Under arbeid · Maria Haugen", href: "/tickets" },
      { id: "t3", title: "Ny laptop til nyansatt", subtitle: "IT · Under arbeid · Thomas Kvam", href: "/tickets" },
      { id: "t4", title: "VPN fungerer ikke hjemmefra", subtitle: "IT · Åpen · Thomas Kvam", href: "/tickets" },
    ],
  },
  {
    key: "filer",
    label: "Filer",
    results: [
      { id: "f1", title: "Onboarding-guide.pdf", subtitle: "Manualer · 2.4 MB", href: "/filer" },
      { id: "f2", title: "Designsystem-v2.fig", subtitle: "Design · 14.7 MB", href: "/filer" },
      { id: "f3", title: "Ansettelseskontrakt-mal.docx", subtitle: "HR-dokumenter · 340 KB", href: "/filer" },
    ],
  },
  {
    key: "medlemmer",
    label: "Medlemmer",
    results: [
      { id: "u1", title: "Anders Sørensen", subtitle: "Admin · anders@intraa.no", href: "/medlemmer" },
      { id: "u2", title: "Maria Haugen", subtitle: "Medlem · maria@intraa.no", href: "/medlemmer" },
      { id: "u3", title: "Thomas Kvam", subtitle: "Medlem · thomas@intraa.no", href: "/medlemmer" },
      { id: "u4", title: "Kari Moe", subtitle: "Medlem · kari@intraa.no", href: "/medlemmer" },
    ],
  },
];

export function searchAll(query: string): SearchSection[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return ALL_RESULTS.map((section) => ({
    ...section,
    results: section.results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q)
    ),
  })).filter((s) => s.results.length > 0);
}

export { ALL_RESULTS };
