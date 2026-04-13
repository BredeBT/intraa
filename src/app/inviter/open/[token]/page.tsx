"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OpenInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token }   = use(params);
  const router      = useRouter();
  const [state, setState] = useState<"idle" | "joining" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    // Auto-join on mount
    async function join() {
      setState("joining");
      try {
        const res = await fetch("/api/org/join-open", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ token }),
        });
        const data = await res.json() as { ok?: boolean; slug?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Ugyldig invitasjonslenke");
        router.replace(`/${data.slug}/feed`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt");
        setState("error");
      }
    }
    void join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#0d0d14" }}>
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}>
            I
          </div>
          <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
        </div>

        <div className="rounded-2xl p-8 shadow-xl" style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.08)" }}>
          {state === "joining" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-10 w-10 animate-spin rounded-full" style={{ border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#6c47ff" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Bli med i community…</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(239,68,68,0.1)" }}>
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Invitasjonslenke ugyldig</h2>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{error}</p>
              </div>
              <Link
                href="/home"
                className="mt-2 rounded-lg px-5 py-2 text-sm font-medium text-white"
                style={{ background: "#6c47ff" }}
              >
                Gå til hjemside
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
