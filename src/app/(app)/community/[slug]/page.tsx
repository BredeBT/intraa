import Link from "next/link";
import { Users, Globe, Lock, Star } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

const MOCK_COMMUNITIES: Record<string, {
  name: string;
  slug: string;
  description: string;
  bannerColor: string;
  accentColor: string;
  initials: string;
  memberCount: number;
  isPublic: boolean;
  plan: string;
  tags: string[];
}> = {
  intraa: {
    name: "Intraa Community",
    slug: "intraa",
    description: "En plass for creators, byggere og gründere som bruker Intraa. Del erfaringer, få hjelp og nettverksjobb med andre.",
    bannerColor: "from-violet-600 to-indigo-700",
    accentColor: "bg-violet-600",
    initials: "IC",
    memberCount: 1247,
    isPublic: true,
    plan: "PRO",
    tags: ["Creator", "Bygging", "Nettverk"],
  },
  designerklubben: {
    name: "Designerklubben",
    slug: "designerklubben",
    description: "Norges største community for produktdesignere, UI/UX og grafiske designere.",
    bannerColor: "from-pink-600 to-rose-700",
    accentColor: "bg-pink-600",
    initials: "DK",
    memberCount: 843,
    isPublic: true,
    plan: "STARTER",
    tags: ["Design", "UI/UX", "Kreativt"],
  },
};

const FALLBACK = {
  name: "Community",
  slug: "community",
  description: "Ingen beskrivelse ennå.",
  bannerColor: "from-zinc-700 to-zinc-800",
  accentColor: "bg-zinc-600",
  initials: "C",
  memberCount: 0,
  isPublic: true,
  plan: "FREE",
  tags: [],
};

export default async function CommunityForsidePage({ params }: Props) {
  const { slug } = await params;
  const community = MOCK_COMMUNITIES[slug] ?? { ...FALLBACK, name: slug, slug };

  return (
    <div>
      {/* Banner */}
      <div className={`h-40 w-full bg-gradient-to-br ${community.bannerColor}`} />

      {/* Info section */}
      <div className="px-8 pb-8">
        {/* Avatar + header row */}
        <div className="flex items-end gap-5 -mt-8 mb-6">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-zinc-950 ${community.accentColor} text-2xl font-bold text-white shadow-lg`}>
            {community.initials}
          </div>
          <div className="mb-1 flex flex-1 items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{community.name}</h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                {community.isPublic ? (
                  <><Globe className="h-3 w-3" /> Offentlig</>
                ) : (
                  <><Lock className="h-3 w-3" /> Privat</>
                )}
                <span>·</span>
                <Users className="h-3 w-3" />
                <span>{community.memberCount.toLocaleString("nb-NO")} medlemmer</span>
                <span>·</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-medium text-zinc-400">
                  {community.plan}
                </span>
              </div>
            </div>
            <Link
              href={`/community/${slug}/feed`}
              className={`shrink-0 rounded-lg ${community.accentColor} px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90`}
            >
              Bli medlem
            </Link>
          </div>
        </div>

        {/* Description */}
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {community.description}
        </p>

        {/* Tags */}
        {community.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {community.tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
              >
                <Star className="h-3 w-3 text-zinc-500" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Feed",         href: `/community/${slug}/feed` },
            { label: "Rangering",    href: `/community/${slug}/rangering` },
            { label: "Konkurranser", href: `/community/${slug}/konkurranser` },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-center text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
