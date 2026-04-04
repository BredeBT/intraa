"use client";

import { useEffect, useState } from "react";
import type { MockUser } from "@/lib/mock-auth";

interface UseUserResult {
  user: MockUser | null;
  isLoading: boolean;
  isAdmin: boolean;
}

export function useUser(): UseUserResult {
  const [user, setUser]         = useState<MockUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() as Promise<MockUser> : Promise.reject())
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, isLoading, isAdmin: user?.role === "ADMIN" };
}
