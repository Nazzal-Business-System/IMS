"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "teal" | "blue" | "purple" | "emerald";
export type Density = "comfortable" | "compact";

interface ThemeSettings {
  mode: ThemeMode;
  accent: AccentColor;
  density: Density;
}

interface ThemeContextValue {
  settings: ThemeSettings;
  resolvedMode: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setDensity: (density: Density) => void;
  toggleResolvedMode: () => void;
}

const STORAGE_KEY = "ims_theme";

const ACCENT_MAP_LIGHT: Record<AccentColor, string> = {
  teal: "#0d9488",
  blue: "#2563eb",
  purple: "#7c3aed",
  emerald: "#059669",
};

const ACCENT_MAP_DARK: Record<AccentColor, string> = {
  teal: "#2dd4bf",
  blue: "#60a5fa",
  purple: "#a78bfa",
  emerald: "#34d399",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_SETTINGS: ThemeSettings = { mode: "dark", accent: "teal", density: "comfortable" };

function loadSettings(): ThemeSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ThemeSettings;
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function resolveMode(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyToDom(s: ThemeSettings): "dark" | "light" {
  const root = document.documentElement;
  const mode = resolveMode(s.mode);
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
  const map = mode === "dark" ? ACCENT_MAP_DARK : ACCENT_MAP_LIGHT;
  root.style.setProperty("--accent", map[s.accent]);
  root.dataset.density = s.density;
  return mode;
}

function persistSettings(s: ThemeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [resolvedMode, setResolvedMode] = useState<"dark" | "light">("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    const mode = applyToDom(loaded);
    persistSettings(loaded);
    setSettings(loaded);
    setResolvedMode(mode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settings.mode === "system") {
        setResolvedMode(applyToDom(settings));
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings, hydrated]);

  const commitSettings = useCallback((next: ThemeSettings) => {
    const mode = applyToDom(next);
    persistSettings(next);
    setResolvedMode(mode);
    setSettings(next);
  }, []);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      commitSettings({ ...settings, mode });
    },
    [settings, commitSettings]
  );

  const setAccent = useCallback(
    (accent: AccentColor) => {
      commitSettings({ ...settings, accent });
    },
    [settings, commitSettings]
  );

  const setDensity = useCallback(
    (density: Density) => {
      commitSettings({ ...settings, density });
    },
    [settings, commitSettings]
  );

  const toggleResolvedMode = useCallback(() => {
    const nextMode: ThemeMode = resolvedMode === "dark" ? "light" : "dark";
    commitSettings({ ...settings, mode: nextMode });
  }, [resolvedMode, settings, commitSettings]);

  const value = useMemo(
    () => ({
      settings,
      resolvedMode,
      setMode,
      setAccent,
      setDensity,
      toggleResolvedMode,
    }),
    [settings, resolvedMode, setMode, setAccent, setDensity, toggleResolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
