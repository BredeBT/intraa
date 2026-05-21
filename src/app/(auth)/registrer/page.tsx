"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, ChevronRight, Loader2, X, Users, Sparkles, Briefcase, ChevronLeft } from "lucide-react";
import { validateUsername } from "@/lib/bannedUsernames";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserType = "FAN" | "CREATOR" | "SPONSOR";

// ─── Username availability hook ───────────────────────────────────────────────

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid";

function useUsernameCheck(username: string): { state: UsernameState; error: string } {
  const [state, setState] = useState<UsernameState>("idle");
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!username) { setState("idle"); setError(""); return; }

    const local = validateUsername(username);
    if (!local.valid) {
      setState("invalid");
      setError(local.error ?? "");
      return;
    }

    setState("checking");
    timerRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json() as { available: boolean; error?: string };
      if (data.available) {
        setState("available");
        setError("");
      } else {
        setState("taken");
        setError(data.error ?? "Brukernavnet er allerede tatt");
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username]);

  return { state, error };
}

// ─── Email availability hook ──────────────────────────────────────────────────

type EmailState = "idle" | "checking" | "available" | "taken";

function useEmailCheck(email: string): EmailState {
  const [state, setState] = useState<EmailState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setState("idle"); return; }

    setState("checking");
    timerRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json() as { available: boolean };
      setState(data.available ? "available" : "taken");
    }, 800);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [email]);

  return state;
}

const PASSWORD_CHECKS = [
  { label: "Minst 8 tegn",          test: (p: string) => p.length >= 8 },
  { label: "Minst ett tall",         test: (p: string) => /\d/.test(p) },
  { label: "Minst ett spesialtegn",  test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
  { label: "Minst én stor bokstav",  test: (p: string) => /[A-Z]/.test(p) },
];

// ─── Type chooser screen ──────────────────────────────────────────────────────

const TYPES: { id: UserType; label: string; tagline: string; icon: React.ElementType; color: string; bg: string }[] = [
  {
    id:      "FAN",
    label:   "Fan",
    tagline: "Bli med i communities og følg creators",
    icon:    Users,
    color:   "#5EEAD4",
    bg:      "rgba(94,234,212,0.10)",
  },
  {
    id:      "CREATOR",
    label:   "Creator",
    tagline: "Bygg ditt eget community og monetiser fansen",
    icon:    Sparkles,
    color:   "#A855F7",
    bg:      "rgba(168,85,247,0.10)",
  },
  {
    id:      "SPONSOR",
    label:   "Sponsor",
    tagline: "Finn creators å samarbeide med",
    icon:    Briefcase,
    color:   "#60A5FA",
    bg:      "rgba(96,165,250,0.10)",
  },
];

function StepTypeChooser({ onChoose }: { onChoose: (t: UserType) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="mb-2 text-sm text-zinc-400">Hva slags konto vil du opprette?</p>
      {TYPES.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChoose(t.id)}
            className="group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:scale-[1.01]"
            style={{
              background:  t.bg,
              borderColor: `${t.color}40`,
            }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `${t.color}25`,
                color:      t.color,
                border:     `1px solid ${t.color}40`,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{t.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{t.tagline}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Account form ─────────────────────────────────────────────────────────────

function StepAccount({ userType, onCreated, onBack }: { userType: UserType; onCreated: () => void; onBack: () => void }) {
  const [name,            setName]    = useState("");
  const [username,        setUsername] = useState("");
  const [email,           setEmail]   = useState("");
  const [password,        setPass]    = useState("");
  const [confirm,         setConfirm] = useState("");
  const [acceptedTerms,   setAcceptedTerms] = useState(false);
  const [serverError,     setServerError] = useState("");
  const [pending,         start]      = useTransition();

  // Sponsor-specific fields
  const [brandName,         setBrandName]        = useState("");
  const [brandWebsite,      setBrandWebsite]     = useState("");
  const [brandDescription,  setBrandDescription] = useState("");

  const { state: unState, error: unError } = useUsernameCheck(username);
  const emailState = useEmailCheck(email);

  const allChecksPass  = PASSWORD_CHECKS.every((c) => c.test(password));
  const passwordsMatch = password.length > 0 && password === confirm;

  const isValid =
    name.trim().length > 0 &&
    unState === "available" &&
    emailState === "available" &&
    allChecksPass &&
    passwordsMatch &&
    acceptedTerms &&
    (userType !== "SPONSOR" || brandName.trim().length > 0);

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isValid || pending) return;
    setServerError("");
    start(async () => {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name, username, email, password,
          userType,
          ...(userType === "SPONSOR" ? { brandName, brandWebsite, brandDescription } : {}),
        }),
      });
      const data = await res.json() as { error?: string; email?: string };
      if (!res.ok) { setServerError(data.error ?? "Noe gikk galt."); return; }
      const { signIn } = await import("next-auth/react");
      await signIn("credentials", { email: data.email ?? email, password, redirect: false });
      onCreated();
    });
  }

  const inp = (highlight?: "error" | "ok") =>
    `w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
      highlight === "error"
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
        : highlight === "ok"
        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
        : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500"
    }`;

  function UsernameIcon() {
    if (!username) return null;
    if (unState === "checking") return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />;
    if (unState === "available") return <Check className="h-4 w-4 text-emerald-400" />;
    if (unState === "taken" || unState === "invalid") return <X className="h-4 w-4 text-rose-400" />;
    return null;
  }

  const typeMeta = TYPES.find((t) => t.id === userType)!;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* Selected type pill + back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors hover:bg-white/5"
        style={{ borderColor: `${typeMeta.color}40`, background: typeMeta.bg }}
      >
        <div className="flex items-center gap-2">
          <ChevronLeft className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: typeMeta.color }}>
            {typeMeta.label}-konto
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">Bytt</span>
      </button>

      {/* Visningsnavn */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          {userType === "SPONSOR" ? "Ditt navn (kontaktperson)" : "Visningsnavn"}
        </label>
        <input type="text" autoComplete="name" placeholder="Fullt navn…"
          value={name} onChange={(e) => setName(e.target.value)} className={inp()} />
      </div>

      {/* Sponsor-only: brand details */}
      {userType === "SPONSOR" && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Brand-navn</label>
            <input type="text" placeholder="F.eks. Acme Energy"
              value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inp()} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nettside (valgfri)</label>
            <input type="url" placeholder="https://acme.no"
              value={brandWebsite} onChange={(e) => setBrandWebsite(e.target.value)} className={inp()} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Kort beskrivelse (valgfri)</label>
            <textarea rows={2} placeholder="Hva selger eller representerer brandet?"
              value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)}
              className={inp() + " resize-none"} />
          </div>
        </>
      )}

      {/* Brukernavn */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Brukernavn</label>
        <div className={`flex overflow-hidden rounded-lg border bg-zinc-800 transition-colors focus-within:ring-1 ${
          unState === "available"
            ? "border-emerald-500 focus-within:border-emerald-500 focus-within:ring-emerald-500"
            : unState === "taken" || unState === "invalid"
            ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500"
            : "border-zinc-700 focus-within:border-indigo-500 focus-within:ring-indigo-500"
        }`}>
          <span className="flex items-center border-r border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-500">@</span>
          <input
            type="text"
            autoComplete="username"
            placeholder="brukernavn"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
          />
          <span className="flex items-center pr-3"><UsernameIcon /></span>
        </div>
        {(unState === "taken" || unState === "invalid") && (
          <p className="mt-1.5 text-xs text-rose-400">{unError}</p>
        )}
        {unState === "available" && (
          <p className="mt-1.5 text-xs text-emerald-400">@{username} er ledig!</p>
        )}
        {!username && (
          <p className="mt-1.5 text-xs text-zinc-600">3–20 tegn, kun bokstaver, tall og _</p>
        )}
      </div>

      {/* E-post */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-post</label>
        <input type="email" autoComplete="email" placeholder="epost@…"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={inp(emailState === "taken" ? "error" : emailState === "available" ? "ok" : undefined)} />
        {emailState === "taken" && (
          <p className="mt-1.5 text-xs text-rose-400">
            En konto med denne e-posten finnes allerede.{" "}
            <Link href="/login" className="underline hover:text-rose-300">Vil du heller logge inn?</Link>
          </p>
        )}
      </div>

      {/* Passord */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Passord</label>
        <input type="password" autoComplete="new-password" placeholder="••••••••"
          value={password} onChange={(e) => setPass(e.target.value)} className={inp()} />
        {password.length > 0 && (
          <ul className="mt-2 space-y-1">
            {PASSWORD_CHECKS.map((check) => {
              const passed = check.test(password);
              return (
                <li key={check.label} className={`flex items-center gap-2 text-xs transition-colors ${
                  passed ? "text-green-400" : "text-zinc-500"
                }`}>
                  <span>{passed ? "✓" : "○"}</span>
                  {check.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bekreft passord */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bekreft passord</label>
        <input type="password" autoComplete="new-password" placeholder="Gjenta passord…"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className={inp(confirm ? (password === confirm ? "ok" : "error") : undefined)} />
        {confirm && (
          <p className={`mt-1 text-xs ${password === confirm ? "text-green-400" : "text-red-400"}`}>
            {password === confirm ? "✓ Passordene matcher" : "✗ Passordene er ikke like"}
          </p>
        )}
      </div>

      {serverError && (
        <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {serverError}
        </p>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-indigo-500"
        />
        <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-zinc-400">
          Jeg godtar{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">vilkårene for bruk</a>
          {" "}og{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">personvernerklæringen</a>
        </label>
      </div>

      <button
        type="submit"
        disabled={!isValid || pending}
        className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
          !isValid || pending ? "cursor-not-allowed opacity-50" : "hover:opacity-90"
        }`}
        style={{ background: `linear-gradient(135deg, ${typeMeta.color}, #A855F7)` }}
      >
        {pending ? "Oppretter konto…" : <><span>Opprett konto</span><ChevronRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RegistrerPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType | null>(null);

  function onCreated() {
    if (userType === "SPONSOR") router.push("/brand/dashboard");
    else router.push("/home");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-violet-600 text-lg font-bold text-white shadow-lg">
          I
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
        <p className="mt-1 text-sm text-zinc-500">Communityet ditt. Hjemmet ditt.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7 shadow-xl">
        <h2 className="mb-5 text-base font-semibold text-white">
          {userType === null ? "Opprett konto" : "Fullfør registrering"}
        </h2>
        {userType === null
          ? <StepTypeChooser onChoose={setUserType} />
          : <StepAccount userType={userType} onCreated={onCreated} onBack={() => setUserType(null)} />
        }
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Har du allerede konto?{" "}
        <Link href="/login" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          Logg inn
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
