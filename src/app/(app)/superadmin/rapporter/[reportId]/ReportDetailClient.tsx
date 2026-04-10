"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING:   "Venter",
  REVIEWED:  "Vurdert",
  RESOLVED:  "Løst",
  DISMISSED: "Avvist",
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  PENDING:   "bg-yellow-500/10 text-yellow-400",
  REVIEWED:  "bg-blue-500/10 text-blue-400",
  RESOLVED:  "bg-emerald-500/10 text-emerald-400",
  DISMISSED: "bg-zinc-700/50 text-zinc-500",
};

interface ReportProps {
  id:          string;
  reason:      string;
  description: string | null;
  status:      string;
  reviewNote:  string | null;
  createdAt:   string;
  reportedBy:  string;
  orgName:     string;
}

interface ReportedUserProps {
  id:           string;
  name:         string;
  username:     string | null;
  email:        string;
  createdAt:    string;
  avatarUrl:    string | null;
  totalReports: number;
  lastActivity: string | null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ReportDetailClient({
  report,
  reportedUser,
}: {
  report:       ReportProps;
  reportedUser: ReportedUserProps;
}) {
  const [status,     setStatus]     = useState<ReportStatus>(report.status as ReportStatus);
  const [reviewNote, setReviewNote] = useState(report.reviewNote ?? "");
  const [saved,      setSaved]      = useState(false);
  const [pending,    start]         = useTransition();

  function patch(data: Record<string, string>) {
    start(async () => {
      const res = await fetch(`/api/superadmin/reports/${report.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (res.ok) setSaved(true);
    });
  }

  function saveNote() {
    patch({ reviewNote, status });
    setTimeout(() => setSaved(false), 2000);
  }

  function changeStatus(s: ReportStatus) {
    setStatus(s);
    patch({ status: s, reviewNote });
  }

  async function banGlobal() {
    await fetch(`/api/superadmin/users/${reportedUser.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isBanned: true }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Rapport-info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{report.reason}</p>
            {report.description && (
              <p className="mt-2 text-sm text-zinc-400">{report.description}</p>
            )}
            <p className="mt-3 text-xs text-zinc-500">
              Innsendt av <span className="text-zinc-300">{report.reportedBy}</span> fra{" "}
              <span className="text-zinc-300">{report.orgName}</span> – {fmt(report.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Rapportert bruker */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Rapportert bruker</h2>
        <div className="flex items-start gap-4">
          {reportedUser.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reportedUser.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-700 text-lg font-bold text-white">
              {initials(reportedUser.name)}
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-white">{reportedUser.name}</p>
            {reportedUser.username && (
              <p className="text-sm text-zinc-500">@{reportedUser.username}</p>
            )}
            <p className="text-sm text-zinc-500">{reportedUser.email}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span>Registrert {fmt(reportedUser.createdAt)}</span>
              <span className={`font-medium ${reportedUser.totalReports > 1 ? "text-rose-400" : "text-zinc-400"}`}>
                {reportedUser.totalReports} rapport{reportedUser.totalReports !== 1 ? "er" : ""} totalt
              </span>
              {reportedUser.lastActivity && (
                <span>Siste aktivitet {fmt(reportedUser.lastActivity)}</span>
              )}
            </div>
            {reportedUser.username && (
              <Link
                href={`/u/${reportedUser.username}`}
                className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300"
              >
                Vis profil →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Moderasjonshandlinger */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Moderasjonshandlinger</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => changeStatus("RESOLVED")}
            disabled={pending || status === "RESOLVED"}
            className="rounded-lg bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-600/30 disabled:opacity-40"
          >
            ✅ Merk som løst
          </button>
          <button
            onClick={() => changeStatus("DISMISSED")}
            disabled={pending || status === "DISMISSED"}
            className="rounded-lg bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            ❌ Avvis rapport
          </button>
          <button
            onClick={banGlobal}
            disabled={pending}
            className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-40"
          >
            🚫 Blokker bruker globalt
          </button>
        </div>
      </div>

      {/* Intern note + status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Superadmin-note</h2>
        <textarea
          rows={3}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Legg til intern vurderingsnote…"
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Status:</label>
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value as ReportStatus)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none"
            >
              <option value="PENDING">Venter</option>
              <option value="REVIEWED">Vurdert</option>
              <option value="RESOLVED">Løst</option>
              <option value="DISMISSED">Avvist</option>
            </select>
          </div>
          <button
            onClick={saveNote}
            disabled={pending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {saved ? "Lagret!" : "Lagre note"}
          </button>
        </div>
      </div>
    </div>
  );
}
