import Link from "next/link";
import { Building2, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6">
      <h1 className="text-6xl font-bold tracking-tight text-white">Intraa</h1>
      <p className="mt-4 text-lg text-zinc-400">Din arbeidsplass. Din community.</p>

      <div className="mt-10 grid w-full max-w-md gap-4 sm:grid-cols-2">
        <Link
          href="/feed"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center transition-colors hover:border-indigo-500/50 hover:bg-zinc-800"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 transition-colors group-hover:bg-indigo-600/30">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Bedriftsintranet</p>
            <p className="mt-0.5 text-xs text-zinc-500">Intern kommunikasjon og verktøy</p>
          </div>
          <span className="text-xs text-indigo-400">Gå inn →</span>
        </Link>

        <Link
          href="/community/feed"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center transition-colors hover:border-violet-500/50 hover:bg-zinc-800"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 transition-colors group-hover:bg-violet-600/30">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Community</p>
            <p className="mt-0.5 text-xs text-zinc-500">Creators, byggere og fagfellesskap</p>
          </div>
          <span className="text-xs text-violet-400">Gå inn →</span>
        </Link>
      </div>
    </main>
  );
}
