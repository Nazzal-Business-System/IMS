"use client";

import { useAuth } from "@/lib/auth";
import { useTheme, type AccentColor, type Density, type ThemeMode } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
  Check,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Rows3,
  Sun,
  type LucideIcon,
} from "lucide-react";

const MODES: {
  value: ThemeMode;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  preview: "dark" | "light" | "system";
}[] = [
  {
    value: "dark",
    labelKey: "settings.theme.dark",
    descriptionKey: "settings.theme.darkDescription",
    icon: Moon,
    preview: "dark",
  },
  {
    value: "light",
    labelKey: "settings.theme.light",
    descriptionKey: "settings.theme.lightDescription",
    icon: Sun,
    preview: "light",
  },
  {
    value: "system",
    labelKey: "settings.theme.system",
    descriptionKey: "settings.theme.systemDescription",
    icon: Monitor,
    preview: "system",
  },
];

const ACCENTS: { value: AccentColor; labelKey: string; color: string }[] = [
  { value: "teal", labelKey: "settings.accent.teal", color: "#14b8a6" },
  { value: "blue", labelKey: "settings.accent.blue", color: "#3b82f6" },
  { value: "purple", labelKey: "settings.accent.purple", color: "#8b5cf6" },
  { value: "emerald", labelKey: "settings.accent.emerald", color: "#10b981" },
];

const DENSITIES: { value: Density; labelKey: string; descriptionKey: string }[] = [
  {
    value: "comfortable",
    labelKey: "settings.density.comfortable",
    descriptionKey: "settings.density.comfortableDescription",
  },
  {
    value: "compact",
    labelKey: "settings.density.compact",
    descriptionKey: "settings.density.compactDescription",
  },
];

function ThemePreview({ variant }: { variant: "dark" | "light" | "system" }) {
  const isDark = variant === "dark";
  const isSystem = variant === "system";

  return (
    <div
      className={cn(
        "relative mt-3 overflow-hidden rounded-lg border p-2 transition-colors",
        isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-100",
        isSystem && "bg-gradient-to-br from-slate-100 to-slate-900 border-slate-400"
      )}
    >
      <div className="flex gap-2">
        <div
          className={cn(
            "h-10 w-8 shrink-0 rounded-md",
            isDark ? "bg-slate-800" : "bg-white shadow-sm",
            isSystem && "bg-gradient-to-b from-white to-slate-800"
          )}
        />
        <div className="flex-1 space-y-1.5">
          <div
            className={cn(
              "h-2 w-3/4 rounded-full",
              isDark ? "bg-slate-700" : "bg-slate-300",
              isSystem && "bg-gradient-to-r from-slate-300 to-slate-600"
            )}
          />
          <div
            className={cn(
              "h-6 rounded-md",
              isDark ? "bg-slate-800" : "bg-white shadow-sm",
              isSystem && "bg-gradient-to-r from-white to-slate-800"
            )}
          />
          <div className="flex gap-1">
            <div className="h-2 w-1/3 rounded-full bg-accent/80" />
            <div
              className={cn(
                "h-2 w-1/4 rounded-full",
                isDark ? "bg-slate-700" : "bg-slate-200"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DensityPreview({ compact }: { compact: boolean }) {
  return (
    <div className="mt-3 space-y-1 rounded-lg border border-border bg-[var(--muted-bg)]/40 p-3">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={cn(
            "flex items-center gap-2 rounded-md bg-card border border-border/60",
            compact ? "px-2 py-1" : "px-3 py-2"
          )}
        >
          <div className="h-2 w-2 rounded-full bg-accent/70 shrink-0" />
          <div className={cn("flex-1 rounded-full bg-muted", compact ? "h-1.5" : "h-2")} />
        </div>
      ))}
    </div>
  );
}

export default function AppearanceSettingsPage() {
  const { canRead } = useAuth();
  const { settings, setMode, setAccent, setDensity } = useTheme();
  const { t } = useI18n();

  if (!canRead("settings")) {
    return <EmptyState title={t("access.denied")} description={t("access.settings")} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/5" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("settings.appearance")}</h2>
            <p className="mt-1 text-sm text-muted max-w-xl">{t("settings.appearance.intro")}</p>
          </div>
        </div>
      </div>

      {/* Theme mode */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-foreground">{t("settings.themeMode")}</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {MODES.map((mode) => {
            const selected = settings.mode === mode.value;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setMode(mode.value)}
                className={cn(
                  "group relative cursor-pointer rounded-xl border bg-card p-4 text-start transition-all",
                  "hover:border-accent/40 hover:shadow-md hover:shadow-accent/5",
                  selected
                    ? "border-accent ring-2 ring-accent/30 shadow-md shadow-accent/10"
                    : "border-border"
                )}
              >
                {selected && (
                  <span className="absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", selected ? "text-accent" : "text-muted")} />
                  <span className={cn("text-sm font-semibold", selected ? "text-accent" : "text-foreground")}>
                    {t(mode.labelKey)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed">{t(mode.descriptionKey)}</p>
                <ThemePreview variant={mode.preview} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent color */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">{t("settings.accentColor")}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{t("settings.accentColorDescription")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCENTS.map((accent) => {
            const selected = settings.accent === accent.value;
            return (
              <button
                key={accent.value}
                type="button"
                onClick={() => setAccent(accent.value)}
                className={cn(
                  "group cursor-pointer rounded-xl border bg-card p-4 text-start transition-all",
                  "hover:border-accent/40 hover:shadow-md",
                  selected
                    ? "border-accent ring-2 ring-accent/30 shadow-md"
                    : "border-border"
                )}
              >
                <div
                  className="h-10 w-full rounded-lg shadow-inner transition-transform group-hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${accent.color} 0%, color-mix(in srgb, ${accent.color} 60%, white) 100%)`,
                  }}
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium", selected ? "text-accent" : "text-foreground")}>
                    {t(accent.labelKey)}
                  </span>
                  {selected && <Check className="h-4 w-4 text-accent shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Density */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Rows3 className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">{t("settings.density")}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{t("settings.densityDescription")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => {
            const selected = settings.density === density.value;
            const isCompact = density.value === "compact";
            return (
              <button
                key={density.value}
                type="button"
                onClick={() => setDensity(density.value)}
                className={cn(
                  "group cursor-pointer rounded-xl border bg-card p-4 text-start transition-all",
                  "hover:border-accent/40 hover:shadow-md",
                  selected
                    ? "border-accent ring-2 ring-accent/30 shadow-md shadow-accent/10"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold", selected ? "text-accent" : "text-foreground")}>
                    {t(density.labelKey)}
                  </span>
                  {selected && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{t(density.descriptionKey)}</p>
                <DensityPreview compact={isCompact} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
