"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LayoutDashboard, Sliders, Users, Settings, AlertTriangle } from "lucide-react";

const NAV = [
  { label: "Oversikt",      href: "oversikt",      icon: LayoutDashboard },
  { label: "Funksjoner",    href: "funksjoner",    icon: Sliders },
  { label: "Medlemmer",     href: "medlemmer",     icon: Users },
  { label: "Innstillinger", href: "innstillinger", icon: Settings },
];

export default function TenantSideNav({
  orgId,
  orgName,
  orgType,
  logoUrl,
}: {
  orgId:   string;
  orgName: string;
  orgType: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const base     = `/superadmin/tenants/${orgId}`;

  return (
    <div className="flex h-full flex-col">
      {/* Back link */}
      <Link
        href="/superadmin/tenants"
        className="mb-5 flex items-center gap-1.5 text-xs transition-colors hover:text-white"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Alle tenants
      </Link>

      {/* Org identity */}
      <div className="mb-5 flex items-center gap-2.5 px-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "#6c47ff" }}
          >
            {orgName[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-white">{orgName}</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {orgType === "COMMUNITY" ? "Community" : "Bedrift"}
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const full   = `${base}/${href}`;
          const active = pathname === full || pathname.startsWith(full + "/");
          return (
            <Link
              key={href}
              href={full}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={active
                ? { background: "rgba(108,71,255,0.18)", color: "#a78bfa" }
                : { color: "rgba(255,255,255,0.45)" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

        {/* Faresone */}
        {(() => {
          const full   = `${base}/faresone`;
          const active = pathname === full || pathname.startsWith(full + "/");
          return (
            <Link
              href={full}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={active
                ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                : { color: "rgba(239,68,68,0.6)" }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Faresone
            </Link>
          );
        })()}
      </nav>
    </div>
  );
}
