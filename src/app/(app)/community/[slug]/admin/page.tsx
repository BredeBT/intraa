import Link from "next/link";
import { Users, TrendingUp, CreditCard, UserPlus, Settings, Users2, BarChart3 } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

// In Phase 4 this will check real role via session.
// For now, mock OWNER access.
const MOCK_ROLE = "OWNER" as const;

const ALLOWED_ROLES = ["OWNER", "ADMIN"] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

export default async function CommunityAdminDashboard({ params }: Props) {
  const { slug } = await params;

  // Role gate — in production this reads from DB via session
  const role: string = MOCK_ROLE;
  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <p className="text-lg font-semibold text-white">Ingen tilgang</p>
        <p className="mt-1 text-sm text-zinc-500">Kun OWNER og ADMIN kan se dette dashbordet.</p>
      </div>
    );
  }

  const stats = [
    { label: "Totale medlemmer", value: "1 247",    icon: Users,      color: "text-indigo-400",  bg: "bg-indigo-500/10" },
    { label: "Aktive i dag",     value: "83",        icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Inntekt (mnd)",    value: "14 890 kr", icon: CreditCard, color: "text-amber-400",   bg: "bg-amber-500/10" },
    { label: "Nye denne uken",   value: "27",        icon: UserPlus,   color: "text-blue-400",    bg: "bg-blue-500/10" },
  ];

  const quickLinks = [
    { label: "Rediger community",   href: `/community/${slug}/admin/innstillinger`, icon: Settings,  description: "Endre navn, banner, farger og mer" },
    { label: "Administrer medlemmer", href: `/community/${slug}/medlemmer`,          icon: Users2,    description: "Roller, planer, tilgang" },
    { label: "Abonnement & inntekt", href: `/community/${slug}/abonnement`,          icon: BarChart3, description: "Betalinger, planer, statistikk" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-white">Creator Dashboard</h1>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
          {role}
        </span>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Oversikt for community: <span className="text-zinc-300 font-medium">{slug}</span></p>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Hurtiglenker</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickLinks.map(({ label, href, icon: Icon, description }) => (
          <Link
            key={label}
            href={href}
            className="group flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
          >
            <div className="mt-0.5 rounded-lg bg-zinc-800 p-2 transition-colors group-hover:bg-zinc-700">
              <Icon className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <p className="font-medium text-white">{label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
