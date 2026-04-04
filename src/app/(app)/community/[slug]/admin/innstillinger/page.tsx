"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Trash2, Save, Palette } from "lucide-react";

type CommunityType = "Gaming" | "IRL" | "Podcast" | "Annet";

const COMMUNITY_TYPES: CommunityType[] = ["Gaming", "IRL", "Podcast", "Annet"];

const ACCENT_COLORS = [
  { label: "Violet",  value: "#7c3aed" },
  { label: "Indigo",  value: "#4f46e5" },
  { label: "Blå",     value: "#2563eb" },
  { label: "Cyan",    value: "#0891b2" },
  { label: "Grønn",   value: "#16a34a" },
  { label: "Amber",   value: "#d97706" },
  { label: "Rose",    value: "#e11d48" },
  { label: "Pink",    value: "#db2777" },
];

export default function CommunityInnstillingerPage() {
  const params = useParams<{ slug: string }>();

  const [name, setName] = useState("Intraa Community");
  const [slug, setSlug] = useState(params.slug ?? "intraa");
  const [description, setDescription] = useState(
    "En plass for creators, byggere og gründere som bruker Intraa."
  );
  const [communityType, setCommunityType] = useState<CommunityType>("Annet");
  const [accentColor, setAccentColor] = useState("#7c3aed");
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Community-innstillinger</h1>
      <p className="mb-8 text-sm text-zinc-500">Tilpass utseende, info og oppførsel for dette communityet.</p>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">

        {/* Generelt */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-300">Generelt</h2>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Navn</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              placeholder="Community-navn"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Slug (URL)</label>
            <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
              <span className="select-none border-r border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-500">
                /community/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
                placeholder="community-slug"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Beskrivelse</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="Beskriv communityet ditt…"
            />
          </div>

          {/* Banner placeholder */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Banner-bilde</label>
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800 text-xs text-zinc-500 hover:border-zinc-600 transition-colors cursor-pointer">
              Klikk for å laste opp banner (1200 × 300px)
            </div>
          </div>

          {/* Logo placeholder */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Logo / ikon</label>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800 text-xs text-zinc-500 hover:border-zinc-600 transition-colors cursor-pointer">
              Last opp
            </div>
          </div>
        </section>

        {/* Type */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Community-type</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COMMUNITY_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setCommunityType(type)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  communityType === type
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* Fargetema */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Fargetema</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => setAccentColor(value)}
                className={`relative h-9 w-9 rounded-full transition-transform hover:scale-110 ${
                  accentColor === value ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : ""
                }`}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Valgt farge: <span className="font-medium text-zinc-300">{ACCENT_COLORS.find(c => c.value === accentColor)?.label}</span>
          </p>
        </section>

        {/* Save button */}
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saved ? "Lagret!" : "Lagre endringer"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="mt-12 max-w-2xl rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="mb-1 text-sm font-semibold text-red-400">Faresone</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Å slette communityet er permanent og kan ikke angres. Alle innlegg, medlemmer og data slettes.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-800 bg-transparent px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
            Slett community
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">Er du sikker? Dette kan ikke angres.</span>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            >
              Avbryt
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              Ja, slett
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
