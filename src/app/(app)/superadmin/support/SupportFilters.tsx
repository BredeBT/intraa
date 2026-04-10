"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_LABELS = [
  { value: "ALL",         label: "Alle statuser" },
  { value: "OPEN",        label: "Åpen" },
  { value: "IN_PROGRESS", label: "Under arbeid" },
  { value: "WAITING",     label: "Venter" },
  { value: "RESOLVED",    label: "Løst" },
  { value: "CLOSED",      label: "Lukket" },
];

const CATEGORIES = ["Teknisk problem", "Faktura", "Funksjonalitet", "Annet"];

export default function SupportFilters() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value && value !== "ALL") {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    router.push(url.toString());
  }

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <select
        value={searchParams.get("status") ?? "ALL"}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 outline-none"
      >
        {STATUS_LABELS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={searchParams.get("category") ?? "ALL"}
        onChange={(e) => setParam("category", e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 outline-none"
      >
        <option value="ALL">Alle kategorier</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
