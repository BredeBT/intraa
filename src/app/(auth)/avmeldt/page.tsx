import Link from "next/link";
import { MailX } from "lucide-react";

export default function AvmeldtPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const hasError = searchParams.error === "1";

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg">
          I
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: hasError ? "rgba(239,68,68,0.1)" : "rgba(108,71,255,0.1)" }}
          >
            <MailX className="h-7 w-7" style={{ color: hasError ? "#f87171" : "#a78bfa" }} />
          </div>
          {hasError ? (
            <>
              <h2 className="text-base font-semibold text-white">Ugyldig lenke</h2>
              <p className="text-sm text-zinc-400">
                Avmeldingslenken er ugyldig eller utløpt. Logg inn for å endre epostinnstillinger.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white">Du er meldt av</h2>
              <p className="text-sm text-zinc-400">
                Du vil ikke lenger motta markedsføringsepost fra Intraa. Viktige epost om kontoen din sendes fortsatt.
              </p>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          Gå til innlogging
        </Link>
      </p>
    </div>
  );
}
