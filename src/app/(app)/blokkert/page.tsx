import Link from "next/link";
import { ShieldX } from "lucide-react";

export default async function BlokkertPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
            <ShieldX className="h-8 w-8 text-rose-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Du er blokkert</h1>
        <p className="mt-3 text-zinc-400">
          {org
            ? <>Du har blitt blokkert fra <span className="text-white font-medium">{org}</span>.</>
            : "Du har blitt blokkert fra denne organisasjonen."}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Ta kontakt med support hvis du mener dette er feil.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/support"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Kontakt support
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
          >
            Gå til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
