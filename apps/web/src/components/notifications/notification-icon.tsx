"use client";

import type { NotificationType } from "@ims/shared-types";
import {
  NOTIFICATION_TYPE_ACCENT,
  NOTIFICATION_TYPE_ICONS,
} from "@/components/notifications/notification-utils";
import { cn } from "@/lib/utils";

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
  size?: "sm" | "md";
}

export function NotificationIcon({
  type,
  className,
  size = "md",
}: NotificationIconProps) {
  const Icon = NOTIFICATION_TYPE_ICONS[type];
  const accent = NOTIFICATION_TYPE_ACCENT[type];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        accent.soft,
        accent.icon,
        className
      )}
      aria-hidden
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </span>
  );
}
