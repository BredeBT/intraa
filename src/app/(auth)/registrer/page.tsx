"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Globe } from "lucide-react";

type OrgType = "bedrift" | "community";

export default function RegistrerPage() {
  const [orgType, setOrgType] = useState<OrgType>("bedrift");

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-white">Intraa</span>
        <p className="mt-1 text-sm text-zinc-500">Din arbeidsplass. Din community.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-6 text-lg font-semibold text-white">Opprett konto</h1>

        <form className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Fullt navn
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Ola Nordmann"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Passord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minst 8 tegn"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Org type */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Type organisasjon</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrgType("bedrift")}
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  orgType === "bedrift"
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                Bedrift
              </button>
              <button
                type="button"
                onClick={() => setOrgType("community")}
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  orgType === "community"
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                <Globe className="h-4 w-4 shrink-0" />
                Community
              </button>
            </div>
          </div>

          {/* Org fields (Bedrift only) */}
          {orgType === "bedrift" && (
            <>
              <div>
                <label htmlFor="orgName" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Bedriftsnavn
                </label>
                <input
                  id="orgName"
                  type="text"
                  placeholder="Acme AS"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="orgSlug" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  URL-slug
                </label>
                <div className="flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                  <span className="flex items-center border-r border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-500">
                    intraa.net/
                  </span>
                  <input
                    id="orgSlug"
                    type="text"
                    placeholder="acme"
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {orgType === "community" && (
            <div>
              <label htmlFor="communityName" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Community-navn
              </label>
              <input
                id="communityName"
                type="text"
                placeholder="Min creator-community"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          <button
            type="submit"
            className={`mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
              orgType === "bedrift"
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-violet-600 hover:bg-violet-500"
            }`}
          >
            Opprett konto
          </button>
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
