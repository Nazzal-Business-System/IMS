"use client";

import { useRef, useState } from "react";
import type { Notification } from "@ims/shared-types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import {
  NOTIFICATION_CATEGORY_ICONS,
  NOTIFICATION_TYPE_ACCENT,
  formatNotificationTime,
} from "@/components/notifications/notification-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  exiting?: boolean;
  onMarkRead?: (id: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onRequestDelete?: (id: string) => void;
  className?: string;
}

export function NotificationItem({
  notification,
  compact = false,
  exiting = false,
  onMarkRead,
  onDelete,
  onRequestDelete,
  className,
}: NotificationItemProps) {
  const { t, language, dir } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const CategoryIcon = NOTIFICATION_CATEGORY_ICONS[notification.category];
  const accent = NOTIFICATION_TYPE_ACCENT[notification.type];
  const unread = !notification.isRead;
  const hasActions = Boolean(onMarkRead || onDelete || onRequestDelete);

  const handleMarkRead = () => {
    void onMarkRead?.(notification.id);
  };

  const handleDelete = () => {
    if (onRequestDelete) {
      onRequestDelete(notification.id);
      return;
    }
    void onDelete?.(notification.id);
  };

  return (
    <article
      ref={articleRef}
      tabIndex={-1}
      className={cn(
        "notification-item group relative flex gap-3 px-3 cursor-default",
        "transition-[background-color,opacity,transform] duration-[180ms] ease-out",
        compact ? "py-2.5" : "py-3",
        unread
          ? "bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
        "focus-visible:outline-none",
        exiting && "pointer-events-none -translate-y-0.5 opacity-0",
        "motion-reduce:transition-none motion-reduce:transform-none",
        className
      )}
      data-unread={unread || undefined}
      data-exiting={exiting || undefined}
      aria-busy={exiting || undefined}
    >
      {unread ? (
        <span
          className={cn(
            "absolute inset-y-2.5 w-0.5 rounded-full",
            "start-0",
            accent.edge
          )}
          aria-hidden
        />
      ) : null}

      <NotificationIcon type={notification.type} size={compact ? "sm" : "md"} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "min-w-0 text-sm leading-snug text-foreground",
                  unread ? "font-semibold" : "font-medium",
                  compact && "truncate"
                )}
              >
                {notification.title}
              </h3>
              {unread ? (
                <>
                  <span className="sr-only">{t("notifications.unread")}</span>
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                </>
              ) : null}
            </div>
            <p
              className={cn(
                "text-[13px] leading-snug text-muted",
                compact ? "line-clamp-2" : "line-clamp-3"
              )}
            >
              {notification.message}
            </p>
          </div>

          {hasActions ? (
            <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={t("notifications.actions")}
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted",
                    "opacity-80 group-hover:opacity-100 group-focus-within:opacity-100",
                    "hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground",
                    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    "transition-opacity duration-150 motion-reduce:transition-none"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align={dir === "rtl" ? "start" : "end"}
                  sideOffset={6}
                  className={cn(
                    "z-[80] min-w-[10.5rem] overflow-hidden rounded-lg",
                    "border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
                    "bg-[var(--popover)] p-1 shadow-lg outline-none"
                  )}
                >
                  {unread && onMarkRead ? (
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-[var(--hover-bg)]"
                      onSelect={() => {
                        handleMarkRead();
                      }}
                    >
                      <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {t("notifications.markRead")}
                    </DropdownMenu.Item>
                  ) : null}
                  {onDelete || onRequestDelete ? (
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-500 outline-none data-[highlighted]:bg-red-500/10"
                      onSelect={() => {
                        handleDelete();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {t("notifications.delete")}
                    </DropdownMenu.Item>
                  ) : null}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <CategoryIcon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            {t(`notifications.category.${notification.category}`)}
          </span>
          <span aria-hidden>·</span>
          <time
            className="tabular-nums"
            dateTime={notification.createdAt}
            title={new Date(notification.createdAt).toLocaleString(
              language === "ar" ? "ar" : undefined
            )}
          >
            {formatNotificationTime(notification.createdAt, language)}
          </time>
        </div>
      </div>
    </article>
  );
}
