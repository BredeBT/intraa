"use client";

import { useSession } from "next-auth/react";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  initials: string;
  isSuperAdmin: boolean;
  userType: "FAN" | "CREATOR" | "SPONSOR";
}

interface UseUserResult {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSponsor: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function useUser(): UseUserResult {
  const { data: session, status } = useSession();
  const raw = session?.user ?? null;

  const user: SessionUser | null = raw
    ? {
        id:          raw.id,
        name:        raw.name ?? "",
        email:       raw.email ?? "",
        image:       raw.image,
        initials:    getInitials(raw.name ?? "?"),
        isSuperAdmin: raw.isSuperAdmin,
        userType:    raw.userType ?? "FAN",
      }
    : null;

  return {
    user,
    isLoading: status === "loading",
    isAdmin:   user?.isSuperAdmin ?? false,
    isSponsor: user?.userType === "SPONSOR",
  };
}
