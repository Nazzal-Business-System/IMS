"use client";

import { CheckCheck, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { NotificationBellEmptyHint } from "@/components/notifications/notification-empty-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationSkeleton } from "@/components/notifications/notification-skeleton";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Notification } from "@ims/shared-types";

interface NotificationPopoverPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isMarkingAll?: boolean;
  isClearingRead?: boolean;
  onMarkRead: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onClearRead: () => void | Promise<void>;
  onViewAll: () => void;
  className?: string;
}

/** Shared popover body (header / list / footer) for the header notification center. */
export function NotificationPopoverPanel({
  notifications,
  unreadCount,
  isLoading,
  isMarkingAll = false,
  isClearingRead = false,
  onMarkRead,
  onDelete,
  onMarkAllRead,
  onClearRead,
  onViewAll,
  className,
}: NotificationPopoverPanelProps) {
  const { t } = useI18n();
  const recent = notifications.slice(0, 8);

  return (
    <div className={cn("flex flex-col", className)}>
      <header className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("notifications.title")}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {unreadCount > 0
              ? t("notifications.unreadCount", { count: unreadCount })
              : t("notifications.allCaughtUp")}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 cursor-pointer gap-1 px-2 text-xs"
            disabled={isMarkingAll}
            onClick={() => void onMarkAllRead()}
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            )}
            {t("notifications.markAllRead")}
          </Button>
        ) : null}
      </header>

      <div
        className={cn(
          "notification-popover-scroll max-h-[min(52vh,22rem)] overflow-y-auto overscroll-contain",
          "border-y border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]",
          "scrollbar-thin"
        )}
      >
        {isLoading && recent.length === 0 ? (
          <NotificationSkeleton rows={5} compact />
        ) : recent.length === 0 ? (
          <NotificationBellEmptyHint />
        ) : (
          <NotificationList
            notifications={recent}
            compact
            onMarkRead={onMarkRead}
            onDelete={onDelete}
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 cursor-pointer gap-1 px-2 text-xs text-muted"
          disabled={isClearingRead}
          onClick={() => void onClearRead()}
        >
          {isClearingRead ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {t("notifications.clearRead")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 cursor-pointer gap-1 px-2 text-xs font-medium"
          onClick={onViewAll}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("notifications.viewAll")}
        </Button>
      </footer>
    </div>
  );
}
