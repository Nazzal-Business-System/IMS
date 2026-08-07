"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AuthRequiredLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}

/** Label + compact danger star. No detached “Required” word. */
export function AuthRequiredLabel({
  htmlFor,
  children,
  className,
}: AuthRequiredLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "inline-flex max-w-full items-baseline gap-1 whitespace-nowrap text-start text-sm font-medium",
        className
      )}
      style={{ color: "var(--auth-fg)" }}
    >
      <span className="truncate">{children}</span>
      <span
        className="shrink-0 font-semibold leading-none"
        style={{ color: "var(--auth-error-fg)" }}
        aria-hidden
      >
        *
      </span>
    </label>
  );
}

/**
 * Locale-aware chrome for technical LTR inputs inside RTL/LTR forms.
 * EN: text left, leading icon left, trailing control right.
 * AR: text right (LTR glyphs), leading icon right, trailing control left.
 */
export function useAuthTechnicalChrome() {
  const { dir } = useI18n();
  const isRtl = dir === "rtl";

  return {
    isRtl,
    leadingIconClass: cn(
      "auth-muted pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2",
      isRtl ? "right-3" : "left-3"
    ),
    trailingControlClass: cn(
      "auth-muted absolute top-1 inline-flex h-9 w-9 items-center justify-center rounded-md",
      isRtl ? "left-1" : "right-1",
      "hover:text-[var(--auth-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
      "disabled:opacity-55"
    ),
    emailPadClass: isRtl ? "pl-3 pr-11" : "pl-10 pr-3",
    passwordPadClass: isRtl ? "pl-11 pr-11" : "pl-10 pr-11",
  };
}

interface AuthTechnicalFieldProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * LTR reading island for email/password. Alignment is locale-driven via CSS:
 * EN text-align left, AR text-align right — glyphs stay LTR either way.
 */
export function AuthTechnicalField({
  children,
  className,
}: AuthTechnicalFieldProps) {
  const { dir } = useI18n();

  return (
    <div
      dir="ltr"
      data-auth-tech-align={dir}
      className={cn("relative auth-technical-field", className)}
    >
      {children}
    </div>
  );
}

export const AUTH_TECHNICAL_INPUT_CLASS =
  "auth-input auth-input-technical flex h-11 w-full rounded-lg border text-sm";
