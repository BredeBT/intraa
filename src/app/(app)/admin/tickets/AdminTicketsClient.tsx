"use client";

import { useState, useTransition } from "react";
import { Plus, X, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id:          string;
  name:        string;
  description: string | null;
  color:       string;
  emoji:       string;
  enabled:     boolean;
  openCount:   number;
}

interface AgentCat {
  id:    string;
  name:  string;
  emoji: string;
  color: string;
}

interface Agent {
  userId:     string;
  name:       string | null;
  avatarUrl:  string | null;
  categories: AgentCat[];
}

interface Member {
  id:   string;
  name: string | null;
}

interface Props {
  orgId:              string;
  initialCategories:  Category[];
  initialAgents:      Agent[];
  allMembers:         Member[];
}

// ─── Category Modal ────────────────────────────────────────────────────────────

const PRESET_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
const PRESET_EMOJIS = ["📋", "💼", "🖥️", "💰", "👥", "🏠", "🔧", "📦", "🎯", "🔒"];

function CategoryModal({
  orgId,
  category,
  onClose,
  onSaved,
}: {
  orgId:    string;
  category: Category | null;
  onClose:  () => void;
  onSaved:  (c: Category) => void;
}) {
  const [name, setName]         = useState(category?.name ?? "");
  const [desc, setDesc]         = useState(category?.description ?? "");
  const [color, setColor]       = useState(category?.color ?? "#6366f1");
  const [emoji, setEmoji]       = useState(category?.emoji ?? "📋");
  const [error, setError]       = useState("");
  const [pending, start]        = useTransition();

  function submit() {
    if (!name.trim()) { setError("Navn er påkrevd"); return; }
    start(async () => {
      const isEdit = !!category;
      const url    = isEdit ? `/api/tickets/categories/${category.id}` : "/api/tickets/categories";
      const method = isEdit ? "PATCH" : "POST";
      const body   = isEdit
        ? { name, description: desc, color, emoji }
        : { orgId, name, description: desc, color, emoji };

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json() as { category?: { id: string; name: string; description: string | null; color: string; emoji: string; enabled: boolean }; error?: string };
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      onSaved({ ...data.category!, openCount: category?.openCount ?? 0 });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">{category ? "Rediger kategori" : "Ny kategori"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

          <div className="flex gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Emoji</label>
              <div className="flex flex-wrap gap-1">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`h-8 w-8 rounded-md text-base transition-colors ${emoji === e ? "bg-zinc-700 ring-1 ring-indigo-500" : "bg-zinc-800 hover:bg-zinc-700"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Navn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. IT-support"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Beskrivelse (valgfri)</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Hva slags saker havner her?"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Farge</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : "hover:scale-110"}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white">Avbryt</button>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40"
          >
            {pending ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Modal ──────────────────────────────────────────────────────────────

function AgentModal({
  orgId,
  agent,
  allMembers,
  categories,
  onClose,
  onSaved,
}: {
  orgId:      string;
  agent:      Agent | null;
  allMembers: Member[];
  categories: Category[];
  onClose:    () => void;
  onSaved:    (a: Agent) => void;
}) {
  const [userId,      setUserId]      = useState(agent?.userId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(agent?.categories.map((c) => c.id) ?? []);
  const [error,       setError]       = useState("");
  const [pending,     start]          = useTransition();

  function toggleCat(id: string) {
    setCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function submit() {
    if (!userId) { setError("Velg en bruker"); return; }
    start(async () => {
      const res  = await fetch("/api/tickets/agents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, categoryIds }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }

      const member     = allMembers.find((m) => m.id === userId);
      const cats       = categories.filter((c) => categoryIds.includes(c.id));
      onSaved({
        userId,
        name:       member?.name ?? null,
        avatarUrl:  agent?.avatarUrl ?? null,
        categories: cats.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color })),
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">{agent ? "Rediger agent" : "Legg til agent"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

          {!agent && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bruker</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="">— Velg bruker —</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
            </div>
          )}

          {agent && (
            <p className="text-sm font-medium text-white">{agent.name}</p>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-400">Kategorier</label>
            <div className="flex flex-col gap-1.5">
              {categories.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(c.id)}
                    onChange={() => toggleCat(c.id)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  <span style={{ background: c.color }} className="h-2 w-2 rounded-full" />
                  <span className="text-sm text-white">{c.emoji} {c.name}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-zinc-500">Ingen kategorier opprettet ennå.</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white">Avbryt</button>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40"
          >
            {pending ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminTicketsClient({ orgId, initialCategories, initialAgents, allMembers }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [agents,     setAgents]     = useState<Agent[]>(initialAgents);
  const [catModal,   setCatModal]   = useState<Category | null | "new">(null);
  const [agentModal, setAgentModal] = useState<Agent | null | "new">(null);
  const [, startT]                  = useTransition();

  function handleCatSaved(c: Category) {
    setCategories((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      return idx >= 0 ? prev.map((x) => x.id === c.id ? c : x) : [...prev, c];
    });
  }

  function handleAgentSaved(a: Agent) {
    setAgents((prev) => {
      const idx = prev.findIndex((x) => x.userId === a.userId);
      return idx >= 0 ? prev.map((x) => x.userId === a.userId ? a : x) : [...prev, a];
    });
  }

  function toggleEnabled(cat: Category) {
    startT(async () => {
      const res = await fetch(`/api/tickets/categories/${cat.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: !cat.enabled }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, enabled: !c.enabled } : c));
      }
    });
  }

  function deleteCategory(cat: Category) {
    if (!confirm(`Slett kategorien "${cat.name}"? Eksisterende tickets beholdes uten kategori.`)) return;
    startT(async () => {
      const res = await fetch(`/api/tickets/categories/${cat.id}`, { method: "DELETE" });
      if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    });
  }

  function removeAgent(agent: Agent) {
    if (!confirm(`Fjern ${agent.name ?? agent.userId} som agent?`)) return;
    startT(async () => {
      const res = await fetch(`/api/tickets/agents?userId=${agent.userId}`, { method: "DELETE" });
      if (res.ok) setAgents((prev) => prev.filter((a) => a.userId !== agent.userId));
    });
  }

  function initials(name: string | null) {
    return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      {/* Categories section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Kategorier</h2>
            <p className="text-xs text-zinc-500">Organiser tickets i kategorier</p>
          </div>
          <button
            onClick={() => setCatModal("new")}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" /> Ny kategori
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-500">Ingen kategorier ennå.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-zinc-800" : ""} bg-zinc-900`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ background: `${cat.color}22` }}
                >
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{cat.name}</p>
                  {cat.description && <p className="text-xs text-zinc-500 truncate">{cat.description}</p>}
                  <p className="text-xs text-zinc-600">{cat.openCount} åpne saker</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(cat)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      cat.enabled
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700"
                    }`}
                  >
                    {cat.enabled ? "Aktiv" : "Inaktiv"}
                  </button>
                  <button
                    onClick={() => setCatModal(cat)}
                    className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Agenter</h2>
            <p className="text-xs text-zinc-500">Brukere som håndterer saker i spesifikke kategorier</p>
          </div>
          <button
            onClick={() => setAgentModal("new")}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            <UserCheck className="h-3.5 w-3.5" /> Legg til agent
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-500">Ingen agenter ennå.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {agents.map((agent, i) => (
              <div
                key={agent.userId}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-zinc-800" : ""} bg-zinc-900`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                  {initials(agent.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{agent.name ?? agent.userId}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {agent.categories.length === 0 ? (
                      <span className="text-xs text-zinc-600">Ingen kategorier</span>
                    ) : agent.categories.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{ background: `${c.color}22`, color: c.color }}
                      >
                        {c.emoji} {c.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setAgentModal(agent)}
                    className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeAgent(agent)}
                    className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {catModal && (
        <CategoryModal
          orgId={orgId}
          category={catModal === "new" ? null : catModal}
          onClose={() => setCatModal(null)}
          onSaved={handleCatSaved}
        />
      )}

      {agentModal && (
        <AgentModal
          orgId={orgId}
          agent={agentModal === "new" ? null : agentModal}
          allMembers={allMembers}
          categories={categories}
          onClose={() => setAgentModal(null)}
          onSaved={handleAgentSaved}
        />
      )}
    </div>
  );
}
