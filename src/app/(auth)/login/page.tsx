import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-white">Intraa</span>
        <p className="mt-1 text-sm text-zinc-500">Din arbeidsplass. Din community.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-6 text-lg font-semibold text-white">Logg inn</h1>

        <form className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
              E-post
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="deg@example.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Passord
              </label>
              <Link href="#" className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">
                Glemt passord?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Logg inn
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Har du ikke konto?{" "}
        <Link href="/registrer" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          Opprett konto
        </Link>
      </p>
    </div>
  );
}
