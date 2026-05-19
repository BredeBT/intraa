"use client";

import Link from "next/link";
import { Radio, Sparkles } from "lucide-react";

export default function LockedChannelTeaser({
  channelName,
  orgName,
  orgSlug,
}: {
  channelName: string;
  orgName:     string;
  orgSlug:     string;
}) {
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
              background: "linear-gradient(135deg, #A855F7, #A855F7)",
              color:      "#050816",
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
          <ul className="text-left space-y-2 mb-7 text-sm">
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
            href={orgSlug ? `/${orgSlug}/fanpass` : `/community/lojalitet`}
            className="block w-full text-center rounded-full px-6 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #A855F7, #A855F7)",
              color:      "#050816",
              boxShadow:  "0 8px 28px rgba(168,85,247,0.4)",
            }}
          >
            Bli Fanpass-medlem →
          </Link>

          <p className="mt-3 text-xs text-zinc-500">
            Du beholder vanlig medlemskap uansett.
          </p>
        </div>
      </div>
    </div>
  );
}
