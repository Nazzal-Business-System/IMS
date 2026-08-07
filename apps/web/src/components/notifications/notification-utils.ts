"use client";

import type { Notification, NotificationCategory, NotificationType } from "@ims/shared-types";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Info,
  KeyRound,
  Package,
  Shield,
  User,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  inventory: Package,
  stock: Warehouse,
  purchase_order: ClipboardList,
  user: User,
  permission: KeyRound,
  system: Shield,
};

/** Restrained semantic accents for icon containers / unread cues */
export const NOTIFICATION_TYPE_ACCENT: Record<
  NotificationType,
  { icon: string; soft: string; edge: string }
> = {
  info: {
    icon: "text-sky-500 dark:text-sky-400",
    soft: "bg-sky-500/10",
    edge: "bg-sky-500",
  },
  success: {
    icon: "text-emerald-500 dark:text-emerald-400",
    soft: "bg-emerald-500/10",
    edge: "bg-emerald-500",
  },
  warning: {
    icon: "text-amber-500 dark:text-amber-400",
    soft: "bg-amber-500/10",
    edge: "bg-amber-500",
  },
  error: {
    icon: "text-red-500 dark:text-red-400",
    soft: "bg-red-500/10",
    edge: "bg-red-500",
  },
};

export type NotificationDayGroup = "today" | "yesterday" | "earlier";

export function getNotificationDayGroup(
  isoDate: string,
  now = new Date()
): NotificationDayGroup {
  const date = new Date(isoDate);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (date >= startToday) return "today";
  if (date >= startYesterday) return "yesterday";
  return "earlier";
}

export function groupNotificationsByDay(notifications: Notification[]) {
  const groups: Record<NotificationDayGroup, Notification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const n of notifications) {
    groups[getNotificationDayGroup(n.createdAt)].push(n);
  }
  return (["today", "yesterday", "earlier"] as NotificationDayGroup[])
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, items: groups[key] }));
}

export function formatNotificationTime(isoDate: string, locale: string) {
  const date = new Date(isoDate);
  const diffMs = date.getTime() - Date.now();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
  });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(Math.sign(diffMs) * absMin, "minute");
  const absHour = Math.round(absMin / 60);
  if (absHour < 24) return rtf.format(Math.sign(diffMs) * absHour, "hour");
  const absDay = Math.round(absHour / 24);
  if (absDay < 7) return rtf.format(Math.sign(diffMs) * absDay, "day");

  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
