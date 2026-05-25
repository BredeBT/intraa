import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Offline — Intraa",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="text-center max-w-md">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          <WifiOff className="h-7 w-7" style={{ color: "#A855F7" }} />
        </div>

        <h1 className="mb-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Du er offline
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Sjekk internettforbindelsen din. Innhold du har sett før kan fortsatt være tilgjengelig.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="javascript:location.reload()"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#5EEAD4", color: "var(--bg-primary)" }}
          >
            <RefreshCw className="h-4 w-4" />
            Prøv igjen
          </a>
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              color:      "var(--text-primary)",
              border:     "1px solid var(--border-subtle)",
            }}
          >
            Tilbake til hjem
          </Link>
        </div>
      </div>
    </div>
  );
}
