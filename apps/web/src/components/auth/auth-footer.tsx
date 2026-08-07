"use client";

import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AuthFooterProps {
  className?: string;
}

/** Footer bar attached to the bottom of the auth shell. */
export function AuthFooter({ className }: AuthFooterProps) {
  const { t } = useI18n();

  return (
    <footer
      className={cn(
        "flex flex-col gap-1 text-[11px] leading-snug sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
      style={{
        borderColor: "var(--auth-divider)",
        color: "var(--auth-muted)",
        background: "var(--auth-shell-bg)",
      }}
    >
      <p className="inline-flex min-w-0 items-start gap-1.5 sm:items-center">
        <ShieldCheck
          className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0"
          style={{ color: "var(--auth-accent)" }}
          aria-hidden
        />
        <span className="text-pretty">{t("login.footer.secure")}</span>
      </p>
      <p className="shrink-0 sm:text-end">{t("login.footer.copyright")}</p>
    </footer>
  );
}
