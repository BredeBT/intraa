"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radio, Sparkles, RefreshCw, Loader2 } from "lucide-react";

interface FanpassStatus {
  matchesQuery: boolean;
  status:       string;
  endDate:      string;
  paidAmount:   number;
}

interface DebugRow {
  orgId:   string;
  orgSlug: string;
  fanpass: FanpassStatus | null;
}

export default function LockedChannelTeaser({
  channelName,
  orgName,
  orgSlug,
}: {
  channelName: string;
  orgName:     string;
  orgSlug:     string;
}) {
  const router = useRouter();
  const refreshed = useRef(false);
  const [checking, setChecking] = useState(false);
  const [debug, setDebug] = useState<{ rowsTotal: number; thisOrg: FanpassStatus | null; userId: string | null } | null>(null);

  // Auto-refresh once on mount — if user actually has Fanpass now (e.g. just
  // got it granted), the server re-render will unlock the channel and the
  // parent will swap to BroadcastView.
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [router]);

  async function checkAccess() {
    setChecking(true);
    try {
      const res = await fetch("/api/debug/my-fanpass");
      const data = await res.json() as {
        user: { id: string } | null;
        fanpassRowsTotal: number;
        memberships: DebugRow[];
      };
      const thisOrg = data.memberships.find((m) => m.orgSlug === orgSlug)?.fanpass ?? null;
      setDebug({ rowsTotal: data.fanpassRowsTotal, thisOrg, userId: data.user?.id ?? null });
      // If query says active, trigger full reload to unstick the cache
      if (thisOrg?.matchesQuery) {
        window.location.reload();
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 min-h-0 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(140deg, #131A35 0%, #0B1027 100%)",
          border:     "1px solid rgba(168,85,247,0.25)",
          boxShadow:  "0 0 80px rgba(168,85,247,0.15)",
        }}
      >
        {/* Glow accent */}
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full opacity-30 blur-[60px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
        />

        <div className="relative">
          {/* Crown icon */}
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              color:      "#fff",
              boxShadow:  "0 8px 32px rgba(168,85,247,0.4)",
            }}
          >
            <span className="text-3xl leading-none">♛</span>
          </div>

          {/* Title */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#A855F7" }}>
            Fanpass-kanal
          </p>
          <h2 className="text-2xl font-bold text-white mb-2">
            #{channelName}
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Dette er en eksklusiv kanal for Fanpass-medlemmer i <strong className="text-white">{orgName}</strong>.
            Få tilgang til broadcasts direkte fra creatoren, eksklusive svar og fellesskap med andre superfans.
          </p>

          {/* Perks */}
          <ul className="text-left space-y-2 mb-6 text-sm">
            <li className="flex items-start gap-2.5 text-zinc-300">
              <Radio className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#A855F7" }} />
              <span>Broadcasts direkte fra creatoren — tekst, bilde og voice-notes</span>
            </li>
            <li className="flex items-start gap-2.5 text-zinc-300">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#A855F7" }} />
              <span>♛-badge synlig overalt i communityet</span>
            </li>
            <li className="flex items-start gap-2.5 text-zinc-300">
              <span className="text-xl mt-0.5 shrink-0 leading-none" style={{ color: "#5EEAD4" }}>✦</span>
              <span>Eksklusive bretttema og premium-funksjoner</span>
            </li>
          </ul>

          <Link
            href={orgSlug ? `/${orgSlug}/lojalitet` : `/community/lojalitet`}
            className="block w-full text-center rounded-full px-6 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
              color:      "#fff",
              boxShadow:  "0 8px 28px rgba(168,85,247,0.4)",
            }}
          >
            Bli Fanpass-medlem →
          </Link>

          <p className="mt-3 text-xs text-zinc-500">
            Du beholder vanlig medlemskap uansett.
          </p>

          {/* Already have Fanpass? Manual recheck */}
          <button
            onClick={() => void checkAccess()}
            disabled={checking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Har du allerede Fanpass? Sjekk tilgang igjen
          </button>

          {/* Diagnose output */}
          {debug && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-left">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Diagnose</p>
              {debug.thisOrg ? (
                debug.thisOrg.matchesQuery ? (
                  <p className="text-xs text-emerald-300">
                    ✓ Fanpass aktiv — laster på nytt…
                  </p>
                ) : (
                  (() => {
                    const ended = new Date(debug.thisOrg.endDate);
                    const expired = ended < new Date();
                    return (
                      <div>
                        <p className="text-xs text-amber-300 mb-1">
                          {expired
                            ? `⏱ Fanpass utløpt ${ended.toLocaleDateString("nb-NO")}`
                            : `Status=${debug.thisOrg.status} blokkerer tilgang`}
                        </p>
                        <p className="font-mono text-[10px] text-white/60 mb-2">
                          status={debug.thisOrg.status} · endDate={ended.toLocaleString("nb-NO")}
                        </p>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          Re-grant via /superadmin/users → Administrer → Fanpass-toggle.
                        </p>
                      </div>
                    );
                  })()
                )
              ) : (
                <p className="text-xs text-rose-300">
                  Ingen Fanpass-rad funnet for {orgSlug}.
                  <br />
                  <span className="text-[10px] text-white/50">Totale Fanpass-rader: {debug.rowsTotal}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
