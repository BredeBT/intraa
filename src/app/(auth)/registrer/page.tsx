"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Globe, ChevronRight, ChevronLeft, AlertCircle, Check } from "lucide-react";

type OrgType = "bedrift" | "community";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirm: string;
  orgType: OrgType;
  orgName: string;
  orgSlug: string;
}

const STEPS = ["Din info", "Passord", "Organisasjon"];

export default function RegistrerPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: "", email: "", password: "", confirm: "",
    orgType: "bedrift", orgName: "", orgSlug: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set(field: keyof FormState, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  }

  function validateStep(): boolean {
    const next: typeof errors = {};
    if (step === 0) {
      if (!form.name.trim())  next.name  = "Navn er påkrevd";
      if (!form.email.trim()) next.email = "E-post er påkrevd";
      else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = "Ugyldig e-postadresse";
    }
    if (step === 1) {
      if (form.password.length < 8) next.password = "Passordet må ha minst 8 tegn";
      if (form.confirm !== form.password) next.confirm = "Passordene stemmer ikke overens";
    }
    if (step === 2) {
      if (!form.orgName.trim()) next.orgName = "Navn er påkrevd";
      if (form.orgType === "bedrift" && !form.orgSlug.trim()) next.orgSlug = "URL-slug er påkrevd";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (validateStep()) setStep(s => s + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validateStep()) {
      // TODO: server action
    }
  }

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:ring-1 ${
      errors[field]
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
        {/* Progress */}
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      i < step
                        ? "bg-indigo-600 text-white"
                        : i === step
                        ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === step ? "text-zinc-300" : "text-zinc-600"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mb-4 h-px flex-1 mx-2 transition-colors ${i < step ? "bg-indigo-600" : "bg-zinc-800"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Step 1: Name + email */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-zinc-400">Fullt navn</label>
                <input id="name" type="text" autoComplete="name" placeholder="Ola Nordmann"
                  value={form.name} onChange={e => set("name", e.target.value)}
                  className={inputClass("name")} />
                {errors.name && <FieldError msg={errors.name} />}
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">E-post</label>
                <input id="email" type="email" autoComplete="email" placeholder="deg@example.com"
                  value={form.email} onChange={e => set("email", e.target.value)}
                  className={inputClass("email")} />
                {errors.email && <FieldError msg={errors.email} />}
              </div>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">Passord</label>
                <input id="password" type="password" autoComplete="new-password" placeholder="Minst 8 tegn"
                  value={form.password} onChange={e => set("password", e.target.value)}
                  className={inputClass("password")} />
                {errors.password && <FieldError msg={errors.password} />}
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-zinc-400">Bekreft passord</label>
                <input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
                  value={form.confirm} onChange={e => set("confirm", e.target.value)}
                  className={inputClass("confirm")} />
                {errors.confirm && <FieldError msg={errors.confirm} />}
              </div>
              {/* Password strength hint */}
              {form.password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[8, 12, 16].map(n => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          form.password.length >= n
                            ? form.password.length >= 16 ? "bg-emerald-500"
                              : form.password.length >= 12 ? "bg-amber-500"
                              : "bg-rose-500"
                            : "bg-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600">
                    {form.password.length < 8 ? "For kort" : form.password.length < 12 ? "Svakt" : form.password.length < 16 ? "Godt" : "Sterkt"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Org type + name */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-400">Type organisasjon</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["bedrift", "community"] as OrgType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("orgType", type)}
                      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        form.orgType === type
                          ? type === "bedrift"
                            ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                            : "border-violet-500/60 bg-violet-500/10 text-violet-300"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      {type === "bedrift" ? <Building2 className="h-4 w-4 shrink-0" /> : <Globe className="h-4 w-4 shrink-0" />}
                      {type === "bedrift" ? "Bedrift" : "Community"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="orgName" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  {form.orgType === "bedrift" ? "Bedriftsnavn" : "Community-navn"}
                </label>
                <input
                  id="orgName" type="text"
                  placeholder={form.orgType === "bedrift" ? "Acme AS" : "Min creator-community"}
                  value={form.orgName} onChange={e => set("orgName", e.target.value)}
                  className={inputClass("orgName")}
                />
                {errors.orgName && <FieldError msg={errors.orgName} />}
              </div>

              {form.orgType === "bedrift" && (
                <div>
                  <label htmlFor="orgSlug" className="mb-1.5 block text-xs font-medium text-zinc-400">URL-slug</label>
                  <div className={`flex overflow-hidden rounded-lg border bg-zinc-800 transition-colors focus-within:ring-1 ${
                    errors.orgSlug ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500" : "border-zinc-700 focus-within:border-indigo-500 focus-within:ring-indigo-500"
                  }`}>
                    <span className="flex items-center border-r border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-500">
                      intraa.net/
                    </span>
                    <input id="orgSlug" type="text" placeholder="acme"
                      value={form.orgSlug} onChange={e => set("orgSlug", e.target.value)}
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none" />
                  </div>
                  {errors.orgSlug && <FieldError msg={errors.orgSlug} />}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className={`mt-6 flex gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> Tilbake
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Neste <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Opprett konto
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Har du allerede konto?{" "}
        <Link href="/login" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          Logg inn
        </Link>
      </p>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {msg}
    </p>
  );
}
