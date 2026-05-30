"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Inbox, FileText } from "lucide-react";
import ThreadList from "./ThreadList";
import CreatorAgreementsList from "./CreatorAgreementsList";

type Tab = "threads" | "agreements";

/**
 * Henvendelser + Avtaler i samme side, med tab-bytting via ?tab=-query.
 * Tab leses fra URL så vi kan dyplinke + navigere tilbake til samme
 * tab. Tellere på fanen vises hvis det er noe uavklart (pending creator-
 * signatur på avtaler, unread på tråder).
 */
export default function CreatorSponsorTabs({ title, subtitle }: { title: string; subtitle: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const urlTab       = searchParams.get("tab");
  const [tab, setTab]               = useState<Tab>(urlTab === "agreements" ? "agreements" : "threads");
  const [pendingAgreements, setPendingAgreements] = useState<number>(0);

  // Hent antall avtaler som venter på signatur — viser badge på fanen
  useEffect(() => {
    void fetch("/api/sponsor/agreements")
      .then((r) => r.json() as Promise<{ asCreator: { status: string }[] }>)
      .then((d) => {
        setPendingAgreements(d.asCreator.filter((a) => a.status === "PENDING_CREATOR").length);
      })
      .catch(() => null);
  }, []);

  function setTabAndUrl(t: Tab) {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "agreements") params.set("tab", "agreements");
    else                    params.delete("tab");
    router.replace(`/sponsor-henvendelser${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div>
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-white/50">{subtitle}</p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-white/10">
        <TabButton
          icon={<Inbox className="h-3.5 w-3.5" />}
          label="Henvendelser"
          active={tab === "threads"}
          onClick={() => setTabAndUrl("threads")}
        />
        <TabButton
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Avtaler"
          active={tab === "agreements"}
          badge={pendingAgreements > 0 ? pendingAgreements : undefined}
          onClick={() => setTabAndUrl("agreements")}
        />
      </div>

      {tab === "threads" ? (
        <ThreadList
          basePath="/sponsor-henvendelser"
          viewerRole="CREATOR"
          title=""
          subtitle=""
        />
      ) : (
        <CreatorAgreementsList />
      )}
    </div>
  );
}

function TabButton({
  icon, label, active, badge, onClick,
}: {
  icon:     React.ReactNode;
  label:    string;
  active:   boolean;
  badge?:   number;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
      style={{
        borderColor: active ? "#A855F7" : "transparent",
        color:       active ? "#fff"    : "rgba(255,255,255,0.55)",
      }}
    >
      {icon} {label}
      {badge !== undefined && (
        <span className="rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
          {badge}
        </span>
      )}
    </button>
  );
}
