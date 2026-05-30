"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp]         = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string; totp?: string; server?: string }>({});
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
    if (needsTotp && totp.length !== 6) next.totp = "Skriv inn 6-sifret kode";
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setLoading(true);
    setErrors({});
    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", { email, password, totp, redirect: false });
      if (result?.error) {
        // NextAuth v5 returnerer feilkoden vi satte i CredentialsSignin.code
        if (result.code === "totp_required" || result.error.includes("totp_required")) {
          setNeedsTotp(true);
          setErrors({ server: "Skriv inn 2FA-koden fra autentiserings-appen din" });
        } else if (result.code === "totp_invalid" || result.error.includes("totp_invalid")) {
          setNeedsTotp(true);
          setErrors({ totp: "Feil 2FA-kode" });
        } else if (result.code === "rate_limited" || result.error.includes("rate_limited")) {
          setErrors({ server: "For mange innloggings-forsøk. Vent litt og prøv igjen." });
        } else {
          setErrors({ server: "Feil e-post eller passord" });
          setNeedsTotp(false);
          setTotp("");
        }
      } else {
        // Respect ?next=/some/path query-param (brukes f.eks. ved test-rolle-bytte i superadmin)
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        router.push(next && next.startsWith("/") ? next : "/home");
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

          {/* 2FA-felt — vises kun når brukeren har det aktivert */}
          {needsTotp && (
            <div>
              <label htmlFor="totp" className="mb-1.5 block text-xs font-medium text-zinc-400">
                2FA-kode
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={totp}
                onChange={e => { setTotp(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors(p => ({ ...p, totp: undefined })); }}
                className={`w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-center text-lg tracking-widest tabular-nums text-white outline-none transition-colors focus:ring-1 ${
                  errors.totp
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                    : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
                }`}
                autoFocus
              />
              {errors.totp && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errors.totp}
                </p>
              )}
              <p className="mt-1.5 text-xs text-zinc-500">
                Åpne autentiserings-appen din (Google Authenticator, 1Password, etc) og skriv inn 6-sifret koden.
              </p>
            </div>
          )}

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

      <p className="mt-3 text-center text-xs text-zinc-700">
        <Link href="/terms" className="transition-colors hover:text-zinc-500">Vilkår</Link>
        {" · "}
        <Link href="/privacy" className="transition-colors hover:text-zinc-500">Personvern</Link>
      </p>
    </div>
  );
}
