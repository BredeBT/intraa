"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme       = "dark" | "light";
export type ThemeChoice = Theme | "system";

interface ThemeContextValue {
  /** Brukerens valg (kan være "system") */
  choice:   ThemeChoice;
  /** Hva som faktisk vises akkurat nå (alltid dark eller light) */
  theme:    Theme;
  setChoice: (next: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  choice:    "dark",
  theme:     "dark",
  setChoice: () => {},
});

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  // Behold legacy-klassen så ting som matcher .dark/.light fortsatt funker
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("dark");
  const [theme,  setTheme]        = useState<Theme>("dark");

  // Initial hydrering: les valg fra localStorage, applyer
  useEffect(() => {
    const stored = (typeof localStorage !== "undefined"
      ? (localStorage.getItem("theme") as ThemeChoice | null)
      : null) ?? "system";

    setChoiceState(stored);
    const resolved: Theme = stored === "system" ? getSystemTheme() : stored;
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Hvis valg = system, lytt på OS-endring
  useEffect(() => {
    if (choice !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const t: Theme = mq.matches ? "light" : "dark";
      setTheme(t);
      applyTheme(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  function setChoice(next: ThemeChoice) {
    setChoiceState(next);
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
    const resolved: Theme = next === "system" ? getSystemTheme() : next;
    setTheme(resolved);
    applyTheme(resolved);
  }

  return (
    <ThemeContext.Provider value={{ choice, theme, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
