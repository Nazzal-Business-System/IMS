"use client";

import { useCallback, useRef, useState } from "react";
import type { Notification } from "@ims/shared-types";
import { NotificationItem } from "@/components/notifications/notification-item";
import { groupNotificationsByDay } from "@/components/notifications/notification-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: Notification[];
  compact?: boolean;
  grouped?: boolean;
  onMarkRead?: (id: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  className?: string;
}

const EXIT_MS = 180;

export function NotificationList({
  notifications,
  compact = false,
  grouped = false,
  onMarkRead,
  onDelete,
  className,
}: NotificationListProps) {
  const { t } = useI18n();
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());

  const focusNeighbor = useCallback((id: string) => {
    const ids = notifications.map((n) => n.id).filter((itemId) => !exitingIds.has(itemId));
    const index = ids.indexOf(id);
    const nextId = ids[index + 1] ?? ids[index - 1];
    if (!nextId) return;
    const node = itemRefs.current.get(nextId);
    const focusable = node?.querySelector<HTMLElement>(".notification-item");
    focusable?.focus();
  }, [exitingIds, notifications]);

  const requestDelete = useCallback(
    (id: string) => {
      if (!onDelete || exitingIds.has(id)) return;
      focusNeighbor(id);
      setExitingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        void Promise.resolve(onDelete(id)).finally(() => {
          setExitingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
      }, EXIT_MS);
    },
    [exitingIds, focusNeighbor, onDelete]
  );

  const renderItem = (n: Notification) => (
    <div
      key={n.id}
      role="listitem"
      ref={(node) => {
        itemRefs.current.set(n.id, node);
      }}
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-[180ms] ease-out",
        exitingIds.has(n.id) ? "max-h-0 opacity-0" : "max-h-40 opacity-100",
        "motion-reduce:transition-none"
      )}
    >
      <NotificationItem
        notification={n}
        compact={compact}
        exiting={exitingIds.has(n.id)}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
        onRequestDelete={onDelete ? requestDelete : undefined}
      />
    </div>
  );

  if (!grouped) {
    return (
      <div
        className={cn(
          "divide-y divide-[color-mix(in_srgb,var(--foreground)_6%,transparent)]",
          className
        )}
        role="list"
      >
        {notifications.map(renderItem)}
      </div>
    );
  }

  const groups = groupNotificationsByDay(notifications);

  return (
    <div className={cn("space-y-3", className)}>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`notif-group-${group.key}`}>
          <h2
            id={`notif-group-${group.key}`}
            className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {t(`notifications.group.${group.key}`)}
          </h2>
          <div
            className="divide-y divide-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            role="list"
          >
            {group.items.map(renderItem)}
          </div>
        </section>
      ))}
    </div>
  );
}
