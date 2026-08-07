"use client";

import { Check, ChevronDown, Globe, Moon, Sun } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface AuthToolbarProps {
  className?: string;
}

const LOCALE_OPTIONS: {
  value: Language;
  nameKey: string;
  codeKey: string;
}[] = [
  {
    value: "en",
    nameKey: "login.controls.language.option.en",
    codeKey: "login.controls.language.en",
  },
  {
    value: "ar",
    nameKey: "login.controls.language.option.ar",
    codeKey: "login.controls.language.ar",
  },
];

/**
 * Compact language + theme toolbar.
 * Language menu uses Radix DropdownMenu (portaled) so auth-shell overflow
 * cannot clip it; surface tokens are self-contained for body portal.
 */
export function AuthToolbar({ className }: AuthToolbarProps) {
  const { language, setLanguage, t, dir } = useI18n();
  const { resolvedMode, toggleResolvedMode } = useTheme();

  return (
    <div className={cn("flex items-center justify-end gap-1.5", className)}>
      <DropdownMenu.Root modal>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={t("login.controls.language")}
            className={cn(
              "auth-control inline-flex h-10 min-w-[4.6rem] cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
              "motion-reduce:transition-none"
            )}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span>{t(`login.controls.language.${language}`)}</span>
            <ChevronDown className="ms-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            /* Logical end: right in LTR, left in RTL. Floating UI here does not
               auto-flip align against document dir for this portal surface. */
            align={dir === "rtl" ? "start" : "end"}
            sideOffset={8}
            alignOffset={0}
            collisionPadding={16}
            avoidCollisions
            className={cn(
              "auth-lang-menu z-[200] w-[8.75rem] overflow-hidden rounded-lg border p-1",
              "outline-none"
            )}
          >
            <DropdownMenu.RadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
              className="flex flex-col"
              style={{ direction: dir }}
            >
              {LOCALE_OPTIONS.map((opt) => (
                <DropdownMenu.RadioItem
                  key={opt.value}
                  value={opt.value}
                  textValue={`${t(opt.nameKey)} ${t(opt.codeKey)}`}
                  className={cn(
                    "auth-lang-menu-item relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 pe-7 text-[13px] leading-tight outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[var(--auth-menu-accent)] focus-visible:ring-inset",
                    "data-[highlighted]:bg-[var(--auth-menu-hover)]",
                    "data-[state=checked]:text-[var(--auth-menu-fg)]",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-start">
                    <span className="font-medium">{t(opt.nameKey)}</span>
                    <span className="auth-lang-menu-muted">
                      {" "}
                      — {t(opt.codeKey)}
                    </span>
                  </span>
                  <DropdownMenu.ItemIndicator className="absolute end-2 top-1/2 -translate-y-1/2">
                    <Check
                      className="h-3.5 w-3.5 text-[var(--auth-menu-accent)]"
                      aria-hidden
                    />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        type="button"
        onClick={toggleResolvedMode}
        aria-label={
          resolvedMode === "dark"
            ? t("login.controls.theme.light")
            : t("login.controls.theme.dark")
        }
        title={t("login.controls.theme")}
        className={cn(
          "auth-control inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
          "motion-reduce:transition-none"
        )}
      >
        {resolvedMode === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
