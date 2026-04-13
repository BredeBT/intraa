"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Inbox, Flag, Users, Mail } from "lucide-react";

const TABS = [
  { label: "Oversikt",  href: "/superadmin",           icon: LayoutDashboard },
  { label: "Tenants",   href: "/superadmin/tenants",   icon: Globe },
  { label: "Brukere",   href: "/superadmin/users",     icon: Users },
  { label: "Support",   href: "/superadmin/support",   icon: Inbox },
  { label: "Rapporter", href: "/superadmin/rapporter", icon: Flag },
  { label: "Epost",     href: "/superadmin/epost",     icon: Mail },
];

export default function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex border-b border-zinc-800">
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = href === "/superadmin"
          ? pathname === "/superadmin"
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-b-2 border-indigo-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
