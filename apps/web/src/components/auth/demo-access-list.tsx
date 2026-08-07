"use client";

import { Zap } from "lucide-react";
import { DEMO_CREDENTIALS } from "@ims/ui";
import { useI18n } from "@/lib/i18n";
import {
  DEMO_ROLE_META,
  DemoAccessRow,
  type DemoRole,
} from "@/components/auth/demo-access-row";
import { cn } from "@/lib/utils";

interface DemoAccessListProps {
  onSelect: (email: string, password: string, role: DemoRole) => void;
  activeRole: DemoRole | null;
  disabled?: boolean;
  className?: string;
}

export function DemoAccessList({
  onSelect,
  activeRole,
  disabled = false,
  className,
}: DemoAccessListProps) {
  const { t } = useI18n();

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="demo-access-heading"
    >
      <div className="relative flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1" style={{ background: "var(--auth-divider)" }} />
        <span className="auth-muted text-[10px] font-semibold uppercase tracking-[0.16em]">
          {t("login.or")}
        </span>
        <div className="h-px flex-1" style={{ background: "var(--auth-divider)" }} />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{
            background: "var(--auth-accent-soft)",
            color: "var(--auth-accent)",
            boxShadow: "inset 0 0 0 1px var(--auth-accent-ring)",
          }}
        >
          <Zap className="h-3 w-3" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="demo-access-heading"
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--auth-fg)" }}
          >
            {t("login.demo.title")}
          </h2>
          <p className="auth-muted hidden text-[11px] leading-snug [@media(min-height:820px)]:block">
            {t("login.demo.hint")}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1" role="list">
        {DEMO_CREDENTIALS.map((cred) => {
          const meta = DEMO_ROLE_META[cred.role];
          return (
            <DemoAccessRow
              key={cred.email}
              role={cred.role}
              email={cred.email}
              password={cred.password}
              nameKey={meta.nameKey}
              summaryKey={meta.summaryKey}
              icon={meta.icon}
              loading={activeRole === cred.role}
              disabled={disabled || activeRole !== null}
              onSelect={onSelect}
            />
          );
        })}
      </ul>
    </section>
  );
}
