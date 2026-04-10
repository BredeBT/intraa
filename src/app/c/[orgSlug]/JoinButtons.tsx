"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function JoinButton({ orgId, slug }: { orgId: string; slug: string }) {
  const [joined,  setJoined]  = useState(false);
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    const res = await fetch("/api/org/join", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId }),
    });
    if (res.ok) setJoined(true);
    setLoading(false);
  }

  if (joined) {
    return (
      <Link
        href={`/${slug}/feed`}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-80"
      >
        Gå til community <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button
      onClick={join}
      disabled={loading}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
    >
      {loading ? "Bli med…" : "Bli med nå →"}
    </button>
  );
}

export function RequestToJoinButton({ orgId }: { orgId: string }) {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  async function request() {
    setLoading(true);
    await fetch("/api/org/join", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <button
      onClick={request}
      disabled={loading || sent}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
    >
      {sent ? "✅ Forespørsel sendt" : loading ? "Sender…" : "Be om tilgang →"}
    </button>
  );
}
