"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";

export default function GlemtPassordPage() {
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("E-post er påkrevd");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Ugyldig e-postadresse");
      return;
    }
    setError("");
    setSubmitted(true);
  }

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
        {submitted ? (
          /* Confirmation state */
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <MailCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Sjekk innboksen din</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Vi har sendt en tilbakestillingslenke til{" "}
                <span className="font-medium text-white">{email}</span>.
                Lenken er gyldig i 30 minutter.
              </p>
            </div>
            <p className="text-xs text-zinc-600">
              Fant du ikke e-posten?{" "}
              <button
                type="button"
                onClick={() => { setSubmitted(false); }}
                className="text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Send på nytt
              </button>
            </p>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className="mb-2 text-lg font-semibold text-white">Glemt passord?</h1>
            <p className="mb-6 text-sm text-zinc-400">
              Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  className={`w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
                    error
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                      : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {error && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Send tilbakestillingslenke
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
