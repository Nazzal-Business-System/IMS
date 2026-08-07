"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { NotificationPopoverPanel } from "@/components/notifications/notification-popover";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();
  const [open, setOpen] = useState(false);
  const {
    unreadCount,
    isLoadingUnread,
    notifications,
    isLoadingList,
    isMarkingAll,
    isClearingRead,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
    refresh,
  } = useNotifications();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refresh();
  };

  const goToAll = () => {
    setOpen(false);
    requestNavigation(() => {
      startNavigation("/notifications");
      router.push("/notifications");
    });
  };

  const bellLabel =
    unreadCount > 0
      ? `${t("topbar.notifications")}. ${t("notifications.unreadCount", { count: unreadCount })}`
      : t("topbar.notifications");

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange} modal>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer"
          aria-label={bellLabel}
          aria-haspopup="menu"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
          {isLoadingUnread && unreadCount === 0 ? (
            <span
              className="absolute end-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-muted"
              aria-hidden
            />
          ) : null}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={dir === "rtl" ? "start" : "end"}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "notification-popover z-50 overflow-hidden rounded-xl outline-none",
            "border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--card)] shadow-xl",
            "w-[min(100vw-1.5rem,26rem)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:animate-none"
          )}
        >
          <NotificationPopoverPanel
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={isLoadingList}
            isMarkingAll={isMarkingAll}
            isClearingRead={isClearingRead}
            onMarkRead={markAsRead}
            onDelete={deleteNotification}
            onMarkAllRead={markAllAsRead}
            onClearRead={clearRead}
            onViewAll={goToAll}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
