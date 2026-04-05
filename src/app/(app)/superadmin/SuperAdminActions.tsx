"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import NyOrgModal from "./NyOrgModal";

export default function SuperAdminActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/superadmin/invitasjoner"
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          <Mail className="h-4 w-4" />
          Send invitasjoner
        </Link>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          Ny organisasjon
        </button>
      </div>

      {modalOpen && <NyOrgModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
