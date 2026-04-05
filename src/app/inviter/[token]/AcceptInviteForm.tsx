"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface Props {
  token:   string;
  email:   string;
  orgName: string;
}

export default function AcceptInviteForm({ token, email }: Props) {
  const [name,          setName]          = useState("");
  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [error,         setError]         = useState("");
  const [isPending,     startTransition]  = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Navn er påkrevd"); return; }
    if (password.length < 8) { setError("Passordet må være minst 8 tegn"); return; }
    if (password !== confirm) { setError("Passordene stemmer ikke overens"); return; }

    startTransition(async () => {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }

      router.push("/feed");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Email — prefilled, readonly */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-post</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-500 outline-none"
        />
      </div>

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Fullt navn</label>
        <input
          type="text"
          autoComplete="name"
          placeholder="Ola Nordmann"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Password */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Passord</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minst 8 tegn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bekreft passord</label>
        <input
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Gjenta passord"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {isPending ? "Oppretter konto…" : "Opprett konto og logg inn"}
      </button>
    </form>
  );
}
