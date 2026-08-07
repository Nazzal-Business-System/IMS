"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NotificationListResponse } from "@ims/shared-types";
import { CheckCheck, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { EmptyState } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import {
  EMPTY_NOTIFICATION_FILTERS,
  NotificationFilterToolbar,
  type NotificationFiltersState,
} from "@/components/notifications/notification-filter-toolbar";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationSkeleton } from "@/components/notifications/notification-skeleton";

export default function NotificationsPage() {
  const { t } = useI18n();
  const { canRead } = useAuth();
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
    isMarkingAll,
    isClearingRead,
  } = useNotifications();
  const [filters, setFilters] = useState<NotificationFiltersState>(
    EMPTY_NOTIFICATION_FILTERS
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (filters.readFilter === "unread") params.set("unread", "true");
    if (filters.readFilter === "read") params.set("read", "true");
    if (filters.category) params.set("category", filters.category);
    if (filters.type) params.set("type", filters.type);
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.fromDate) params.set("from", filters.fromDate);
    if (filters.toDate) params.set("to", filters.toDate);
    return params.toString();
  }, [filters]);

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.readFilter !== "all" ||
    Boolean(filters.category) ||
    Boolean(filters.type) ||
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate);

  const { data, isLoading, isError, refetch, isFetched } = useQuery({
    queryKey: ["notifications", "page", queryString],
    queryFn: () => apiFetch<NotificationListResponse>(`/notifications?${queryString}`),
    enabled: canRead("notifications"),
    placeholderData: (previous) => previous,
  });

  const notifications = data?.notifications ?? [];
  const showInitialSkeleton = isLoading && !isFetched && notifications.length === 0;

  if (!canRead("notifications")) {
    return (
      <EmptyState title={t("access.denied")} description={t("access.notifications")} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("notifications.pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("notifications.pageSubtitle")}</p>
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            {unreadCount > 0
              ? t("notifications.unreadCount", { count: unreadCount })
              : t("notifications.allCaughtUp")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 cursor-pointer gap-1.5 border-0 bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-4 w-4" aria-hidden />
            )}
            {t("notifications.markAllRead")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 cursor-pointer gap-1.5 text-muted"
            onClick={() => void clearRead()}
            disabled={isClearingRead}
          >
            {isClearingRead ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            {t("notifications.clearRead")}
          </Button>
        </div>
      </div>

      <NotificationFilterToolbar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_NOTIFICATION_FILTERS)}
      />

      <section className="min-w-0" aria-label={t("notifications.title")}>
        {showInitialSkeleton ? (
          <NotificationSkeleton rows={6} />
        ) : isError && notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-1 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("notifications.loadError")}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="cursor-pointer border-0 bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              onClick={() => void refetch()}
            >
              {t("notifications.retry")}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState
            variant={hasActiveFilters ? "filtered" : "empty"}
            onClearFilters={
              hasActiveFilters
                ? () => setFilters(EMPTY_NOTIFICATION_FILTERS)
                : undefined
            }
          />
        ) : (
          <NotificationList
            notifications={notifications}
            grouped
            onMarkRead={markAsRead}
            onDelete={deleteNotification}
          />
        )}

        {data && data.total > notifications.length ? (
          <p className="px-3 py-2.5 text-center text-xs text-muted">
            {t("notifications.showingCount", {
              shown: notifications.length,
              total: data.total,
            })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
