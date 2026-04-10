"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<{ email?: string; password?: string; server?: string }>({});
  const [loading, setLoading]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim())    next.email    = "E-post er påkrevd";
    if (!password.trim()) next.password = "Passord er påkrevd";
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setLoading(true);
    setErrors({});
    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setErrors({ server: "Feil e-post eller passord" });
      } else {
        router.push("/home");
      }
    } catch {
      setErrors({ server: "Noe gikk galt. Prøv igjen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`w-full max-w-sm transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg">
          I
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
        <p className="mt-1 text-sm text-zinc-500">Din arbeidsplass. Ditt community.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h1 className="mb-6 text-lg font-semibold text-white">Logg inn</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
              E-post
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="deg@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
              className={`w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
                errors.email
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Passord
              </label>
              <Link href="/glemt-passord" className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">
                Glemt passord?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
              className={`w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
                errors.password
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {errors.password && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errors.password}
              </p>
            )}
          </div>

          {errors.server && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errors.server}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? "Logger inn…" : "Logg inn"}
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
