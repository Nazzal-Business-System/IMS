"use client";

import { useAuth } from "@/lib/auth";
import { useI18n, type Language } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

const LANGUAGES: { value: Language; labelKey: string; nativeKey: string }[] = [
  { value: "en", labelKey: "settings.language.english", nativeKey: "settings.language.english" },
  { value: "ar", labelKey: "settings.language.arabic", nativeKey: "settings.language.arabicNative" },
];

export default function LanguageSettingsPage() {
  const { canRead } = useAuth();
  const { language, setLanguage, dir, t } = useI18n();

  if (!canRead("settings")) {
    return <EmptyState title={t("access.denied")} description={t("access.settings")} />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setLanguage(lang.value)}
                className={cn(
                  "cursor-pointer rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors",
                  language === lang.value
                    ? "border-accent bg-accent/10"
                    : "hover:bg-muted"
                )}
              >
                <p className={cn("text-sm font-medium", language === lang.value ? "text-accent" : "text-foreground")}>
                  {t(lang.nativeKey)}
                </p>
                <p className="text-xs text-muted mt-0.5">{t(lang.labelKey)}</p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground font-medium">{t("settings.rtlNote")}</p>
            <p className="text-xs text-muted mt-1">
              {language === "ar" ? t("settings.rtlActive") : t("settings.rtlInactive")}
            </p>
            <p className="text-xs text-muted mt-2">
              {t("settings.currentDirection")}: <span className="font-mono text-accent">{dir.toUpperCase()}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
