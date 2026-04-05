import { Trophy } from "lucide-react";

export default function RangeringPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Rangering</h1>
      <p className="mb-8 text-sm text-zinc-500">Topp bidragsytere i communityet</p>

      <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
        <Trophy className="mb-3 h-10 w-10" />
        <p className="text-sm">Ingen rangering ennå.</p>
        <p className="mt-1 text-xs text-zinc-700">Poeng-systemet er under utvikling.</p>
      </div>
    </div>
  );
}
