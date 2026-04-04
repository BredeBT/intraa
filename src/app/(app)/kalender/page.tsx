"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Clock, Users } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  description: string;
  attendees: string[];
  color: string;
}

const TODAY = new Date();
const YM = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
const dateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const INITIAL_EVENTS: CalEvent[] = [
  { id: "e1", title: "Standup", date: dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()), time: "09:00", description: "Daglig standup med teamet.", attendees: ["Anders Sørensen", "Maria Haugen", "Thomas Kvam"], color: "bg-indigo-500" },
  { id: "e2", title: "Designreview", date: dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1), time: "11:00", description: "Gjennomgang av nytt designsystem.", attendees: ["Anders Sørensen", "Kari Moe"], color: "bg-violet-500" },
  { id: "e3", title: "Allmøte", date: dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 4), time: "10:00", description: "Kvartalsmøte for hele organisasjonen.", attendees: ["Anders Sørensen", "Maria Haugen", "Thomas Kvam", "Ole Rønning", "Linn Berg", "Kari Moe"], color: "bg-emerald-500" },
  { id: "e4", title: "1:1 med Maria", date: dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 2), time: "14:00", description: "Ukentlig 1:1-samtale.", attendees: ["Anders Sørensen", "Maria Haugen"], color: "bg-rose-500" },
  { id: "e5", title: "Sprintplanlegging", date: dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7), time: "09:30", description: "Planlegging av neste sprint.", attendees: ["Anders Sørensen", "Thomas Kvam", "Kari Moe"], color: "bg-amber-500" },
];

const ALL_MEMBERS = ["Anders Sørensen", "Maria Haugen", "Thomas Kvam", "Ole Rønning", "Linn Berg", "Kari Moe"];
const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function KalenderPage() {
  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth());
  const [events, setEvents] = useState<CalEvent[]>(INITIAL_EVENTS);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", description: "", attendees: [] as string[] });

  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const todayStr = dateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function eventsForDay(d: number) {
    return events.filter(e => e.date === dateStr(year, month, d));
  }

  function createEvent(e: React.FormEvent) {
    e.preventDefault();
    const ev: CalEvent = {
      id: `e-${Date.now()}`,
      ...newEvent,
      color: "bg-indigo-500",
    };
    setEvents(prev => [...prev, ev]);
    setShowModal(false);
    setNewEvent({ title: "", date: "", time: "", description: "", attendees: [] });
  }

  const selectedEvents = selectedDay ? events.filter(e => e.date === selectedDay) : [];
  const monthName = new Date(year, month, 1).toLocaleString("no-NO", { month: "long", year: "numeric" });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Calendar */}
      <div className="flex flex-1 flex-col overflow-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="w-44 text-center text-lg font-semibold capitalize text-white">{monthName}</h1>
            <button onClick={nextMonth} className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            + Ny hendelse
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
          {WEEKDAYS.map(d => (
            <div key={d} className="bg-zinc-900 py-2 text-center text-xs font-semibold text-zinc-500">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="min-h-24 bg-zinc-950" />;
            const ds = dateStr(year, month, day);
            const dayEvents = eventsForDay(day);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDay;
            return (
              <div
                key={ds}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                className={`min-h-24 cursor-pointer p-2 transition-colors ${
                  isSelected ? "bg-zinc-800" : "bg-zinc-950 hover:bg-zinc-900"
                }`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                  isToday ? "bg-indigo-600 text-white" : "text-zinc-400"
                }`}>
                  {day}
                </span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} className={`truncate rounded px-1.5 py-0.5 text-xs font-medium text-white ${ev.color}`}>
                      {ev.time} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-zinc-500">+{dayEvents.length - 3} til</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className={`flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-all duration-300 ${selectedDay ? "" : "translate-x-full opacity-0 pointer-events-none"}`}>
        {selectedDay && (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <p className="text-sm font-semibold text-white">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              {selectedEvents.length === 0 && (
                <p className="text-sm text-zinc-500">Ingen hendelser denne dagen.</p>
              )}
              {selectedEvents.map(ev => (
                <div key={ev.id} className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                  <div className={`mb-2 inline-block h-1.5 w-8 rounded-full ${ev.color}`} />
                  <p className="font-medium text-white">{ev.title}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5" />
                    {ev.time}
                  </div>
                  {ev.description && (
                    <p className="mt-2 text-xs text-zinc-400">{ev.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="h-3.5 w-3.5" />
                    {ev.attendees.length} deltakere
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New event modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Ny hendelse</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tittel</label>
                <input required value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Dato</label>
                  <input required type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tid</label>
                  <input required type="time" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Beskrivelse</label>
                <textarea rows={2} value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Inviter medlemmer</label>
                <div className="flex flex-col gap-1.5">
                  {ALL_MEMBERS.map(m => (
                    <label key={m} className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                      <input type="checkbox" checked={newEvent.attendees.includes(m)}
                        onChange={e => setNewEvent(p => ({
                          ...p,
                          attendees: e.target.checked ? [...p.attendees, m] : p.attendees.filter(a => a !== m),
                        }))}
                        className="accent-indigo-600" />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:text-white">
                  Avbryt
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                  Lagre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
