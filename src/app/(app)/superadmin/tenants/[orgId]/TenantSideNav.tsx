"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sliders, Users, Settings, AlertTriangle } from "lucide-react";

const NAV = [
  { label: "Oversikt",   href: "oversikt",    icon: LayoutDashboard },
  { label: "Funksjoner", href: "funksjoner",  icon: Sliders },
  { label: "Medlemmer",  href: "medlemmer",   icon: Users },
  { label: "Innstillinger", href: "innstillinger", icon: Settings },
  { label: "Faresone",   href: "faresone",    icon: AlertTriangle, danger: true },
];

export default function TenantSideNav({
  orgId,
  orgName,
  orgType,
}: {
  orgId:   string;
  orgName: string;
  orgType: string;
}) {
  const pathname = usePathname();
  const base     = `/superadmin/tenants/${orgId}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-4 px-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
          {orgName[0].toUpperCase()}
        </div>
        <p className="mt-2 font-semibold text-white leading-tight">{orgName}</p>
        <p className="text-xs text-zinc-500">{orgType === "COMMUNITY" ? "Community" : "Bedrift"}</p>
      </div>

      {NAV.map(({ label, href, icon: Icon, danger }) => {
        const full   = `${base}/${href}`;
        const active = pathname === full || pathname.startsWith(full + "/");
        return (
          <Link
            key={href}
            href={full}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              danger
                ? active
                  ? "bg-red-900/30 text-red-400"
                  : "text-zinc-500 hover:bg-red-900/20 hover:text-red-400"
                : active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
