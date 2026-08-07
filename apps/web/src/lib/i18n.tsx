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
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

export type Language = "en" | "ar";

const DICTS: Record<Language, Record<string, string>> = { en, ar };

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  mounted: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const LANG_KEY = "ims_language";

function applyDocumentLanguage(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Language | null;
    if (stored === "en" || stored === "ar") {
      setLanguageState(stored);
      applyDocumentLanguage(stored);
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
    applyDocumentLanguage(lang);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyDocumentLanguage(language);
  }, [language, mounted]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = DICTS[language][key] ?? DICTS.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return text;
    },
    [language]
  );

  const dir: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dir,
      mounted,
    }),
    [language, setLanguage, t, dir, mounted]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
