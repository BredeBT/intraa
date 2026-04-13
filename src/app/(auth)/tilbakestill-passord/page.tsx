"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";

function ResetForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Mangler tilbakestillingstoken — bruk lenken fra eposten.");
      return;
    }

    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!regex.test(password)) {
      setError("Passordet må være minst 8 tegn med minst én stor bokstav, ett tall og ett spesialtegn.");
      return;
    }
    if (password !== confirm) {
      setError("Passordene stemmer ikke overens.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
      hasError
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
        : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
    }`;

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg">
          I
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
        <p className="mt-1 text-sm text-zinc-500">Din arbeidsplass. Ditt community.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Passord oppdatert!</h2>
              <p className="mt-2 text-sm text-zinc-400">Du sendes til innlogging…</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-lg font-semibold text-white">Nytt passord</h1>
            <p className="mb-6 text-sm text-zinc-400">
              Velg et nytt passord for kontoen din.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Nytt passord
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minst 8 tegn, stor bokstav, tall og spesialtegn"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className={inputClass(!!error && !confirm)}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Bekreft passord
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Gjenta passordet"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  className={inputClass(!!error)}
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? "Lagrer…" : "Sett nytt passord"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          ← Tilbake til innlogging
        </Link>
      </p>
    </div>
  );
}

export default function TilbakestillPassordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
