"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  WifiOff,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { looksLikeRecordId, useBreadcrumbTitle } from "@/lib/breadcrumb-title";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { GuardedLink } from "@/components/layout/guarded-link";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useNotifications } from "@/lib/notifications";
import { Select } from "@/components/ui/select";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "nav.dashboard",
  products: "nav.products",
  categories: "nav.categories",
  warehouses: "nav.warehouses",
  suppliers: "nav.suppliers",
  "stock-movements": "nav.stockMovements",
  "purchase-orders": "nav.purchaseOrders",
  reports: "nav.reports",
  "reorder-rules": "nav.reorderRules",
  units: "nav.units",
  "audit-log": "nav.auditLog",
  "import-export": "nav.importExport",
  notifications: "nav.notifications",
  settings: "nav.settings",
  security: "settings.security",
  appearance: "settings.appearance",
  language: "settings.language",
  profile: "nav.profile",
  admin: "nav.admin",
  users: "nav.users",
  permissions: "nav.permissions",
  "user-growth": "admin.userGrowth.title",
};

interface TopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Topbar({ onMenuClick, className }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canRead } = useAuth();
  const { socketStatus } = useNotifications();
  const { language, setLanguage, t } = useI18n();
  const { settings, resolvedMode, toggleResolvedMode } = useTheme();
  const { startNavigation } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();
  const { title: recordTitle } = useBreadcrumbTitle();
  const [signingOut, setSigningOut] = useState(false);

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;
    const labelKey = SEGMENT_LABELS[segment];
    const isRecordId = looksLikeRecordId(segment);
    let label: string;
    let pending = false;
    if (isLast && isRecordId) {
      if (recordTitle) {
        label = recordTitle;
      } else {
        label = t("breadcrumb.loading");
        pending = true;
      }
    } else if (labelKey) {
      label = t(labelKey);
    } else if (isRecordId) {
      label = t("breadcrumb.loading");
      pending = true;
    } else {
      label = segment.replace(/-/g, " ");
    }
    return { href, label, isLast, pending, isRecordId };
  });

  const handleSignOut = () => {
    requestNavigation(() => {
      startNavigation();
      setSigningOut(true);
      logout();
      router.push("/login");
    });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--header)_88%,transparent)] px-4 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--header)_78%,transparent)]",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t("topbar.openMenu")}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <nav aria-label={t("topbar.breadcrumb")} className="hidden min-w-0 items-center gap-1 text-sm md:flex">
        <GuardedLink href="/dashboard" className="text-muted hover:text-foreground transition-colors">
          {t("app.name")}
        </GuardedLink>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1">
            <span className="text-muted" aria-hidden>
              /
            </span>
            {crumb.isLast ? (
              <span
                className={cn(
                  "truncate font-medium text-foreground",
                  crumb.pending && "animate-pulse text-muted"
                )}
                title={crumb.pending ? undefined : crumb.label}
                aria-current="page"
                dir={crumb.isRecordId ? "auto" : undefined}
              >
                {crumb.label}
              </span>
            ) : (
              <GuardedLink
                href={crumb.href}
                className="truncate text-muted transition-colors hover:text-foreground"
                title={crumb.label}
              >
                {crumb.label}
              </GuardedLink>
            )}
          </span>
        ))}
      </nav>

      <div className="relative ms-auto flex max-w-md flex-1 items-center gap-2 sm:max-w-xs lg:max-w-sm">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="hidden h-9 w-[4.5rem] sm:block"
          aria-label={t("settings.language")}
        >
          <option value="en">{t("topbar.language.en")}</option>
          <option value="ar">{t("topbar.language.ar")}</option>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleResolvedMode}
          aria-label={t("settings.appearance")}
          title={settings.mode === "system" ? t("topbar.systemTheme") : resolvedMode}
        >
          {resolvedMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {canRead("notifications") && (
          <>
            {socketStatus === "reconnecting" || socketStatus === "disconnected" ? (
              <span
                className={cn(
                  "hidden items-center gap-1 rounded-md px-2 py-1 text-xs sm:inline-flex",
                  socketStatus === "reconnecting"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-destructive/10 text-destructive"
                )}
                title={
                  socketStatus === "reconnecting"
                    ? t("topbar.socket.reconnecting")
                    : t("topbar.socket.disconnected")
                }
              >
                {socketStatus === "reconnecting" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span className="max-w-[8rem] truncate">
                  {socketStatus === "reconnecting"
                    ? t("topbar.socket.reconnecting")
                    : t("topbar.socket.disconnected")}
                </span>
              </span>
            ) : null}
            <NotificationBell />
          </>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <UserAvatar
                name={user?.name}
                avatarUrl={user?.avatarUrl}
                cacheKey={user?.updatedAt}
                size="sm"
                className="ring-1"
              />
              <span className="hidden max-w-[8rem] truncate text-sm text-foreground sm:inline">
                {user?.name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[14rem] rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-1.5 shadow-lg"
            >
              <div className="border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={user?.name}
                    avatarUrl={user?.avatarUrl}
                    cacheKey={user?.updatedAt}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted" dir="ltr">
                      {user?.email}
                    </p>
                    <p className="text-xs capitalize text-muted">
                      {user?.role ? t(`role.${user.role}`) : ""}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-[var(--hover-bg)] hover:text-accent focus:bg-[var(--hover-bg)]"
                onSelect={(e) => {
                  e.preventDefault();
                  requestNavigation(() => {
                    startNavigation("/profile");
                    router.push("/profile");
                  });
                }}
              >
                <User className="h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-[var(--hover-bg)] hover:text-accent focus:bg-[var(--hover-bg)]"
                onSelect={(e) => {
                  e.preventDefault();
                  requestNavigation(() => {
                    startNavigation("/settings/appearance");
                    router.push("/settings/appearance");
                  });
                }}
              >
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 outline-none transition-colors hover:bg-red-500/10 hover:text-red-500 focus:bg-red-500/10"
                disabled={signingOut}
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {t("action.signOut")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
