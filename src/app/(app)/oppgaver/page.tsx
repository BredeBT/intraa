"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Plus } from "lucide-react";

type ColId = "todo" | "doing" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  column: ColId;
}

const COLUMNS: { id: ColId; label: string; color: string }[] = [
  { id: "todo",  label: "Å gjøre",  color: "text-zinc-400" },
  { id: "doing", label: "Pågår",    color: "text-blue-400" },
  { id: "done",  label: "Ferdig",   color: "text-emerald-400" },
];

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Sette opp CI/CD pipeline", description: "Konfigurer GitHub Actions for automatisk deploy til Vercel.", assignee: "Thomas Kvam", column: "todo" },
  { id: "t2", title: "Skriv API-dokumentasjon", description: "Dokumenter alle server actions i Confluence.", assignee: "Maria Haugen", column: "todo" },
  { id: "t3", title: "Implementer notifikasjoner", description: "Real-time push-varsler via Supabase Realtime.", assignee: "Anders Sørensen", column: "doing" },
  { id: "t4", title: "Designreview av dashboard", description: "Gå gjennom admin-dashboardet med designteamet.", assignee: "Kari Moe", column: "doing" },
  { id: "t5", title: "Sett opp Prisma schema", description: "Database-modeller for alle entiteter.", assignee: "Anders Sørensen", column: "done" },
  { id: "t6", title: "Lag mock-data for alle sider", description: "Seed-data for utvikling uten database.", assignee: "Thomas Kvam", column: "done" },
];

function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
    >
      <button
        {...listeners}
        {...attributes}
        className="mt-0.5 cursor-grab text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button className="flex-1 text-left" onClick={onClick}>
        <p className="text-sm font-medium text-white">{task.title}</p>
        {task.assignee && (
          <p className="mt-1.5 text-xs text-zinc-500">{task.assignee}</p>
        )}
      </button>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="flex cursor-grabbing items-start gap-2 rounded-xl border border-indigo-500/50 bg-zinc-900 p-4 shadow-xl">
      <GripVertical className="mt-0.5 h-4 w-4 text-zinc-500" />
      <div>
        <p className="text-sm font-medium text-white">{task.title}</p>
        {task.assignee && <p className="mt-1.5 text-xs text-zinc-500">{task.assignee}</p>}
      </div>
    </div>
  );
}

export default function OppgaverPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [adding, setAdding] = useState<ColId | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeTask = tasks.find(t => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const overId = String(over.id);
    const colId = (COLUMNS.map(c => c.id) as string[]).includes(overId)
      ? (overId as ColId)
      : tasks.find(t => t.id === overId)?.column;

    if (!colId) return;
    setTasks(prev => prev.map(t => t.id === String(active.id) ? { ...t, column: colId } : t));
  }

  function addTask(col: ColId) {
    const title = newTitle.trim();
    if (!title) return;
    setTasks(prev => [...prev, { id: `t-${Date.now()}`, title, description: "", assignee: "", column: col }]);
    setNewTitle("");
    setAdding(null);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Oppgaver</h1>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-4 overflow-hidden">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.column === col.id);
            return (
              <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50">
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1.5 text-xs text-zinc-400">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setAdding(col.id); setNewTitle(""); }}
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                  <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => setSelected(task)} />
                    ))}
                  </SortableContext>

                  {/* Add task inline */}
                  {adding === col.id && (
                    <div className="rounded-xl border border-indigo-500/50 bg-zinc-900 p-3">
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addTask(col.id); if (e.key === "Escape") setAdding(null); }}
                        placeholder="Tittel på oppgave…"
                        className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => addTask(col.id)} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500">
                          Legg til
                        </button>
                        <button onClick={() => setAdding(null)} className="rounded-md px-3 py-1 text-xs text-zinc-500 hover:text-white">
                          Avbryt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
            <h2 className="flex-1 pr-4 text-sm font-semibold leading-snug text-white">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-800/50 p-4 text-sm">
              <div>
                <p className="mb-1 text-xs text-zinc-500">Kolonne</p>
                <p className="text-xs text-zinc-300">{COLUMNS.find(c => c.id === selected.column)?.label}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">Tildelt</p>
                <p className="text-xs text-zinc-300">{selected.assignee || "—"}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Beskrivelse</p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {selected.description || "Ingen beskrivelse."}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Flytt til</p>
              <div className="flex flex-col gap-1">
                {COLUMNS.filter(c => c.id !== selected.column).map(col => (
                  <button
                    key={col.id}
                    onClick={() => {
                      setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, column: col.id } : t));
                      setSelected(s => s ? { ...s, column: col.id } : null);
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-left text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                  >
                    → {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
