"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import NyOrgModal from "./NyOrgModal";

export default function SuperAdminActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href="/superadmin/invitasjoner"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          <Mail className="h-3.5 w-3.5" />
          Send invitasjoner
        </Link>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Ny organisasjon
        </button>
      </div>

      {modalOpen && <NyOrgModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
