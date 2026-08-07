"use client";

import { Bell, FilterX, Inbox } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NotificationEmptyStateProps {
  variant?: "empty" | "filtered";
  className?: string;
  onClearFilters?: () => void;
}

export function NotificationEmptyState({
  variant = "empty",
  className,
  onClearFilters,
}: NotificationEmptyStateProps) {
  const { t } = useI18n();
  const filtered = variant === "filtered";
  const Icon = filtered ? FilterX : Inbox;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-8 text-center",
        className
      )}
      role="status"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
        <Icon className="h-5 w-5 text-muted" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">
        {filtered ? t("notifications.noResults") : t("notifications.empty")}
      </p>
      <p className="max-w-[28ch] text-xs text-muted">
        {filtered
          ? t("notifications.noResultsDescription")
          : t("notifications.emptyDescription")}
      </p>
      {filtered && onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 cursor-pointer text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("notifications.clearFilters")}
        </button>
      ) : null}
    </div>
  );
}

export function NotificationBellEmptyHint() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center" role="status">
      <Bell className="h-5 w-5 text-muted" aria-hidden />
      <p className="text-sm font-medium text-foreground">{t("notifications.allCaughtUp")}</p>
      <p className="text-xs text-muted">{t("notifications.emptyDescription")}</p>
    </div>
  );
}
