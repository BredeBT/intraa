import { Swords } from "lucide-react";

export default function KonkurranserPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Konkurranser</h1>
      <p className="mb-8 text-sm text-zinc-500">Delta, vis hva du kan og vinn premier</p>

      <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
        <Swords className="mb-3 h-10 w-10" />
        <p className="text-sm">Ingen aktive konkurranser ennå.</p>
        <p className="mt-1 text-xs text-zinc-700">Sjekk tilbake senere.</p>
      </div>
    </div>
  );
}
