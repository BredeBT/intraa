import Link from "next/link";
import { XCircle } from "lucide-react";

export default function UtloptPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15">
          <XCircle className="h-7 w-7 text-rose-400" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">Invitasjonen er utløpt</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Denne invitasjonslenken er ikke lenger gyldig. Ta kontakt med den som inviterte deg for å få en ny lenke.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Gå til innlogging
        </Link>
      </div>
    </div>
  );
}
