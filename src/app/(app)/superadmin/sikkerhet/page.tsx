import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ShieldAlert, ShieldCheck, MapPin, Globe, Check } from "lucide-react";
import BackButton from "../BackButton";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

const FILTER_TABS = [
  { label: "Uavklarte", value: "open"     },
  { label: "Avklarte",  value: "reviewed" },
  { label: "Alle",      value: "all"      },
] as const;

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Server action — gjøres direkte fra <form>-en så vi slipper et eget API.
async function markReviewed(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) return;

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;

  await db.loginEvent.update({
    where: { id: eventId },
    data:  { reviewedAt: new Date(), reviewedBy: session.user.id },
  });
  revalidatePath("/superadmin/sikkerhet");
}

export default async function SikkerhetPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { filter } = await searchParams;
  const activeFilter = (filter === "reviewed" || filter === "all") ? filter : "open";

  const where = {
    suspicious: true,
    ...(activeFilter === "open"     && { reviewedAt: null }),
    ...(activeFilter === "reviewed" && { reviewedAt: { not: null } }),
  };

  const events = await db.loginEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    100,
    include: {
      user: {
        select: {
          id:           true,
          name:         true,
          username:     true,
          email:        true,
          avatarUrl:    true,
          totpEnabled:  true,
        },
      },
    },
  });

  const openCount = await db.loginEvent.count({
    where: { suspicious: true, reviewedAt: null },
  });

  return (
    <div className="px-8 py-8">
      <BackButton />
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-400" />
        <h1 className="text-xl font-semibold text-white">Sikkerhet — brukere under mistanke</h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Innlogginger fra et annet land enn forrige gang. Brukeren får
        automatisk en notifikasjon i appen. Marker som avklart når du har
        verifisert at det ikke er noe galt.
      </p>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1.5">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "open" ? "/superadmin/sikkerhet" : `?filter=${tab.value}`}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
            {tab.value === "open" && openCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                {openCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
          <p className="text-sm text-zinc-400">Ingenting å se her — alt er rolig.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const reviewed = e.reviewedAt !== null;
            return (
              <div
                key={e.id}
                className={`rounded-xl border p-4 ${
                  reviewed
                    ? "border-zinc-800 bg-zinc-900/40 opacity-70"
                    : "border-amber-500/30 bg-amber-500/[0.04]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {e.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                      {(e.user.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Header */}
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="font-semibold text-white">{e.user.name ?? "Ukjent"}</p>
                      <p className="text-xs text-zinc-500">@{e.user.username}</p>
                      <p className="text-xs text-zinc-600">·</p>
                      <p className="text-xs text-zinc-500">{e.user.email}</p>
                    </div>

                    {/* Explanation */}
                    <p className="mt-2 text-sm text-zinc-300">
                      Logget på fra{" "}
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-300">
                        <Globe className="h-3 w-3" />
                        {e.country ?? "??"}
                      </span>
                      {" — forrige innlogging var fra "}
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-300">
                        <Globe className="h-3 w-3" />
                        {e.previousCountry ?? "??"}
                      </span>
                    </p>

                    {/* Meta */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>{fmtDateTime(e.createdAt)}</span>
                      {e.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.city}
                        </span>
                      )}
                      {e.ip && <span className="font-mono">{e.ip}</span>}
                    </div>

                    {/* 2FA status */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {e.user.totpEnabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          <ShieldCheck className="h-3 w-3" /> 2FA aktivert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                          <ShieldAlert className="h-3 w-3" /> Ingen 2FA — høyere risiko
                        </span>
                      )}
                      {e.userAgent && (
                        <span
                          className="truncate rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500 max-w-[260px]"
                          title={e.userAgent}
                        >
                          {e.userAgent}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/superadmin/users?search=${encodeURIComponent(e.user.username)}`}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:text-white"
                    >
                      Åpne bruker
                    </Link>
                    {reviewed ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                        <Check className="h-3 w-3" /> Avklart
                      </span>
                    ) : (
                      <form action={markReviewed}>
                        <input type="hidden" name="eventId" value={e.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-amber-500"
                        >
                          Marker avklart
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
