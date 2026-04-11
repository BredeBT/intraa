"use client";

import { useRouter, useSearchParams } from "next/navigation";

const ACTIVE_STATUS_LABELS = [
  { value: "ALL",         label: "Alle statuser" },
  { value: "OPEN",        label: "Åpen" },
  { value: "IN_PROGRESS", label: "Under arbeid" },
  { value: "WAITING",     label: "Venter" },
];

const RESOLVED_STATUS_LABELS = [
  { value: "ALL",      label: "Alle statuser" },
  { value: "RESOLVED", label: "Løst" },
  { value: "CLOSED",   label: "Lukket" },
];

const CATEGORIES = ["Teknisk problem", "Faktura", "Funksjonalitet", "Annet"];

export default function SupportFilters({ currentTab }: { currentTab: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", currentTab); // preserve current tab
    url.searchParams.delete("page");         // reset pagination on filter change
    if (value && value !== "ALL") {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    router.push(url.toString());
  }

  const statusLabels = currentTab === "resolved" ? RESOLVED_STATUS_LABELS : ACTIVE_STATUS_LABELS;

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <select
        value={searchParams.get("status") ?? "ALL"}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 outline-none"
      >
        {statusLabels.map(({ value, label }) => (
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
