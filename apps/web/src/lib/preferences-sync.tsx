"use client";

import { useEffect, useRef } from "react";
import type { UserPreferences } from "@ims/shared-types";
import { useAuth } from "@/lib/auth";
import { useTheme, type AccentColor } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

const ACCENTS: AccentColor[] = ["teal", "blue", "purple", "emerald"];

function isAccent(value: string): value is AccentColor {
  return ACCENTS.includes(value as AccentColor);
}

export function PreferencesSync() {
  const { user } = useAuth();
  const { settings, setMode, setAccent, setDensity } = useTheme();
  const { language, setLanguage } = useI18n();
  const hydratingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      userIdRef.current = null;
      return;
    }
    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    const prefs = user.preferences;
    if (!prefs) return;

    hydratingRef.current = true;
    if (prefs.theme) setMode(prefs.theme);
    if (prefs.accent && isAccent(prefs.accent)) setAccent(prefs.accent);
    if (prefs.density) setDensity(prefs.density);
    if (prefs.language === "en" || prefs.language === "ar") setLanguage(prefs.language);

    const timer = window.setTimeout(() => {
      hydratingRef.current = false;
    }, 150);
    return () => window.clearTimeout(timer);
  }, [user, setMode, setAccent, setDensity, setLanguage]);

  useEffect(() => {
    if (!user || hydratingRef.current) return;

    const timer = window.setTimeout(() => {
      const payload: UserPreferences = {
        theme: settings.mode,
        accent: settings.accent,
        density: settings.density,
        language,
      };
      apiFetch("/auth/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      }).catch(() => {
        /* localStorage fallback remains primary on failure */
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [user, settings.mode, settings.accent, settings.density, language]);

  return null;
}
