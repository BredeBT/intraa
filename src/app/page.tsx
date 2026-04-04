import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
      <h1 className="text-6xl font-bold tracking-tight text-white">Intraa</h1>
      <p className="mt-4 text-lg text-zinc-400">Din arbeidsplass. Din community.</p>
      <Link
        href="/feed"
        className="mt-8 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Gå til app
      </Link>
    </main>
  );
}
