"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton({ label = "Tilbake" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
  );
}
