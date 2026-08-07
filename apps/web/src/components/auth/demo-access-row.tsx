"use client";

import { ArrowRight, Eye, Loader2, Shield, UserCog, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type DemoRole = "Admin" | "Manager" | "Viewer";

interface DemoAccessRowProps {
  role: DemoRole;
  email: string;
  password: string;
  nameKey: string;
  summaryKey: string;
  icon: LucideIcon;
  loading: boolean;
  disabled: boolean;
  onSelect: (email: string, password: string, role: DemoRole) => void;
}

export function DemoAccessRow({
  role,
  email,
  password,
  nameKey,
  summaryKey,
  icon: Icon,
  loading,
  disabled,
  onSelect,
}: DemoAccessRowProps) {
  const { t, dir } = useI18n();
  const roleName = t(nameKey);
  const busy = disabled;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(email, password, role)}
        disabled={busy}
        aria-busy={loading}
        data-active={loading || undefined}
        aria-label={`${roleName}. ${t(summaryKey)}. ${t("login.demo.action")}`}
        className={cn(
          "auth-row group flex h-12 w-full items-center gap-2.5 rounded-xl border px-2.5 text-start",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "motion-reduce:transition-none",
          loading && "border-[var(--auth-accent-ring)] bg-[var(--auth-accent-soft)]"
        )}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "var(--auth-accent-soft)",
            color: "var(--auth-accent)",
            boxShadow: "inset 0 0 0 1px var(--auth-accent-ring)",
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Icon className="h-4 w-4" aria-hidden />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "var(--auth-fg)" }}
            >
              {roleName}
            </span>
            <span
              className="shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
              style={{
                color: "var(--auth-accent)",
                background: "var(--auth-accent-soft)",
                boxShadow: "inset 0 0 0 1px var(--auth-accent-ring)",
              }}
            >
              {t("login.demo.badge")}
            </span>
          </span>
          <span className="auth-muted mt-0.5 block truncate text-[11px] leading-snug">
            {loading
              ? t("login.demo.signingIn", { role: roleName })
              : t(summaryKey)}
          </span>
        </span>

        <ArrowRight
          className={cn(
            "auth-muted h-4 w-4 shrink-0 transition-transform group-hover:text-[var(--auth-accent)]",
            "group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
            "motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
            dir === "rtl" && "rotate-180"
          )}
          aria-hidden
        />
      </button>
    </li>
  );
}

export const DEMO_ROLE_META: Record<
  DemoRole,
  { icon: LucideIcon; nameKey: string; summaryKey: string }
> = {
  Admin: {
    icon: Shield,
    nameKey: "login.demo.admin.name",
    summaryKey: "login.demo.admin.summary",
  },
  Manager: {
    icon: UserCog,
    nameKey: "login.demo.manager.name",
    summaryKey: "login.demo.manager.summary",
  },
  Viewer: {
    icon: Eye,
    nameKey: "login.demo.viewer.name",
    summaryKey: "login.demo.viewer.summary",
  },
};
