"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X, Loader2 } from "lucide-react";
import { createOrganization } from "@/server/actions/organizations";
import {
  dismissOnboarding,
  ensureOpenInviteToken,
  type OnboardingProgress,
} from "@/server/actions/onboarding";

interface Props {
  progress: OnboardingProgress;
}

function toSlug(name: string) {
  return name
    .toLowerCase().trim()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const AURORA = "linear-gradient(135deg, #5EEAD4, #A855F7)";
const STEP_LABELS: { key: keyof OnboardingProgress["steps"]; title: string; hint: string }[] = [
  { key: "createCommunity", title: "Opprett ditt community",     hint: "Gi det et navn og en URL" },
  { key: "brandTheme",      title: "Last opp logo + banner",     hint: "Personliggjør utseendet" },
  { key: "firstPost",       title: "Skriv din første post",      hint: "Velkommen til fansene dine" },
  { key: "invite",          title: "Inviter dine første fans",   hint: "Generer en delbar lenke" },
];

export default function OnboardingChecklist({ progress }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) return null;

  const pct = Math.round((progress.completed / progress.total) * 100);
  const hasCommunity = progress.orgId !== "";

  return (
    <div
      className="rounded-2xl border p-5 mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(94,234,212,0.06), rgba(168,85,247,0.08))",
        borderColor: "rgba(168,85,247,0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: AURORA }}
          >
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Kom i gang som creator</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {progress.completed} av {progress.total} fullført
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DismissButton onDone={() => setCollapsed(true)} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: "var(--border-subtle)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: AURORA }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEP_LABELS.map((step, i) => {
          const done = progress.steps[step.key];

          // Step 1 (createCommunity) renderes som inline form når ikke fullført
          if (step.key === "createCommunity" && !done) {
            return <CreateCommunityRow key={step.key} index={i} step={step} onCreated={() => router.refresh()} />;
          }

          // De fleste steg har en target-rute. Ingen rute = "ikke klikkbar"-tilstand.
          const href = hrefForStep(step.key, progress);

          return (
            <StepRow
              key={step.key}
              index={i}
              done={done}
              title={step.title}
              hint={step.hint}
              href={hasCommunity && !done ? href : undefined}
              onClick={step.key === "invite" && !done && hasCommunity
                ? () => handleInvite(progress.orgId, progress.orgSlug, router)
                : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepRow({
  index, done, title, hint, href, onClick,
}: {
  index:   number;
  done:    boolean;
  title:   string;
  hint:    string;
  href?:   string;
  onClick?: () => void;
}) {
  const content = (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{
        background: done ? "rgba(94,234,212,0.06)" : "var(--bg-glass)",
        border:     done ? "1px solid rgba(94,234,212,0.18)" : "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={done
          ? { background: AURORA, color: "#fff" }
          : { background: "var(--border-subtle)", color: "var(--text-secondary)" }
        }
      >
        {done ? <Check className="h-4 w-4" /> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through" : ""}`}
           style={{ color: done ? "var(--text-tertiary)" : "var(--text-primary)" }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{hint}</p>
      </div>
      {!done && (href || onClick) && (
        <span className="text-xs font-medium" style={{ color: "#5EEAD4" }}>Start →</span>
      )}
    </div>
  );

  if (done) return content;
  if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>;
  if (href)   return <Link href={href}>{content}</Link>;
  return content;
}

function CreateCommunityRow({
  index, step, onCreated,
}: {
  index: number;
  step:  { title: string; hint: string };
  onCreated: () => void;
}) {
  const [name, setName]       = useState("");
  const [slug, setSlug]       = useState("");
  const [edited, setEdited]   = useState(false);
  const [error, setError]     = useState("");
  const [pending, start]      = useTransition();

  const computedSlug = edited ? slug : toSlug(name);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createOrganization(name, computedSlug, "COMMUNITY", "FREE");
      if (!res.success) { setError(res.error); return; }
      onCreated();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl px-3 py-3"
      style={{ background: "var(--bg-glass)", border: "1px solid rgba(168,85,247,0.25)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          {index + 1}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{step.title}</p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{step.hint}</p>
        </div>
      </div>

      <div className="space-y-2 pl-10">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Navn på communityet (f.eks. «Studio Lykke»)"
          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
          style={{ background: "var(--border-subtle)", border: "1px solid var(--border-subtle)" }}
        />
        <div className="flex items-center overflow-hidden rounded-lg"
             style={{ background: "var(--border-subtle)", border: "1px solid var(--border-subtle)" }}>
          <span className="select-none px-3 py-2 text-xs"
                style={{ color: "var(--text-tertiary)", borderRight: "1px solid var(--border-subtle)" }}>
            intraa.net/
          </span>
          <input
            value={computedSlug}
            onChange={(e) => { setEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }}
            placeholder="studio-lykke"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </div>
        {error && (
          <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={pending || !name.trim() || !computedSlug.trim()}
          className="w-full rounded-lg py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: AURORA }}
        >
          {pending ? "Oppretter…" : "Opprett community"}
        </button>
      </div>
    </form>
  );
}

function DismissButton({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await dismissOnboarding(); onDone(); })}
      disabled={pending}
      className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
      style={{ color: "var(--text-tertiary)" }}
      title="Skjul checklisten"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hrefForStep(
  key:      keyof OnboardingProgress["steps"],
  progress: OnboardingProgress,
): string | undefined {
  if (progress.orgId === "") return undefined;
  switch (key) {
    case "brandTheme": return `/admin/innstillinger?tab=utseende`;
    case "firstPost":  return `/${progress.orgSlug}/feed`;
    case "invite":     return undefined; // håndteres via onClick
    default:           return undefined;
  }
}

async function handleInvite(orgId: string, _orgSlug: string, router: ReturnType<typeof useRouter>) {
  const res = await ensureOpenInviteToken(orgId);
  if (!res.success) {
    alert(res.error);
    return;
  }
  const url = `${window.location.origin}/inviter/open/${res.token}`;
  try {
    await navigator.clipboard?.writeText(url);
    alert(`Invitasjonslenke kopiert!\n\n${url}`);
  } catch {
    prompt("Kopier denne lenken:", url);
  }
  router.refresh();
}
