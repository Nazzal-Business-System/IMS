"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  RefreshCw,
  Ruler,
  ScrollText,
  Bell,
  ArrowUpDown,
  Settings,
  Shield,
  LogOut,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { GuardedLink } from "@/components/layout/guarded-link";
import type { PermissionSection } from "@ims/shared-types";

interface NavItem {
  section: PermissionSection;
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { section: "dashboard", href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { section: "notifications", href: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { section: "products", href: "/products", labelKey: "nav.products", icon: Package },
  { section: "categories", href: "/categories", labelKey: "nav.categories", icon: Tags },
  { section: "warehouses", href: "/warehouses", labelKey: "nav.warehouses", icon: Warehouse },
  { section: "suppliers", href: "/suppliers", labelKey: "nav.suppliers", icon: Truck },
  { section: "stock_movements", href: "/stock-movements", labelKey: "nav.stockMovements", icon: ArrowLeftRight },
  { section: "purchase_orders", href: "/purchase-orders", labelKey: "nav.purchaseOrders", icon: ClipboardList },
  { section: "reports", href: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { section: "reorder_rules", href: "/reorder-rules", labelKey: "nav.reorderRules", icon: RefreshCw },
  { section: "units", href: "/units", labelKey: "nav.units", icon: Ruler },
  { section: "audit_log", href: "/audit-log", labelKey: "nav.auditLog", icon: ScrollText },
  { section: "import_export", href: "/import-export", labelKey: "nav.importExport", icon: ArrowUpDown },
];

const SIDEBAR_MIN_EXPANDED = 200;
const SIDEBAR_MAX = 340;

interface SidebarNavProps {
  widthPx: number;
  collapsed: boolean;
  hoverExpanded?: boolean;
  resizable?: boolean;
  onSidebarMouseEnter?: () => void;
  onSidebarMouseLeave?: () => void;
  onWidthChange?: (width: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export function SidebarNav({
  widthPx,
  collapsed,
  hoverExpanded = false,
  resizable = false,
  onSidebarMouseEnter,
  onSidebarMouseLeave,
  onWidthChange,
  mobileOpen = false,
  onMobileClose,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { canRead, hasAdminAccess, logout } = useAuth();
  const { t } = useI18n();
  const { startNavigation } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();
  const [signingOut, setSigningOut] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const mainItems = MAIN_NAV.filter((item) => canRead(item.section));
  const showNarrow = collapsed && !hoverExpanded;
  const isOverlayExpand = collapsed && hoverExpanded;

  const resizingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable || !onWidthChange) return;
      e.preventDefault();
      resizingRef.current = true;
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = widthPx;
      const isRtl = document.documentElement.dir === "rtl";

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const adjusted = isRtl ? -delta : delta;
        onWidthChange(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN_EXPANDED, startWidth + adjusted)));
      };

      const onUp = () => {
        resizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [resizable, onWidthChange, widthPx]
  );

  const handleSignOut = () => {
    requestNavigation(() => {
      startNavigation();
      setSigningOut(true);
      logout();
      router.push("/login");
    });
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <GuardedLink
        href={item.href}
        onClick={onMobileClose}
        title={showNarrow ? t(item.labelKey) : undefined}
        className={cn(
          "flex items-center rounded-lg text-sm transition-colors cursor-pointer w-full",
          showNarrow ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
          active
            ? "bg-accent/15 text-accent font-medium"
            : "text-muted hover:bg-[var(--hover-bg)] hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!showNarrow && <span className="truncate">{t(item.labelKey)}</span>}
      </GuardedLink>
    );
  };

  return (
    <aside
      onMouseEnter={onSidebarMouseEnter}
      onMouseLeave={onSidebarMouseLeave}
      style={{ width: widthPx }}
      className={cn(
        "fixed inset-y-0 start-0 z-50 flex flex-col border-e border-border bg-sidebar transition-[width] duration-300 ease-out",
        isOverlayExpand && "shadow-2xl shadow-black/30 ring-1 ring-border",
        mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0",
        resizingRef.current && "transition-none",
        isResizing && "transition-none",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0",
          showNarrow ? "justify-center px-2 py-3" : "justify-between gap-2 px-4 py-3"
        )}
      >
        {!showNarrow && (
          <div className="min-w-0">
            <p className="truncate font-bold text-accent">{t("app.name")}</p>
            <p className="truncate text-xs text-muted">{t("app.subtitle")}</p>
          </div>
        )}
        {showNarrow && (
          <span className="text-lg font-bold text-accent" title={t("app.name")}>N</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5 min-h-0">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3 space-y-0.5 bg-sidebar">
        {canRead("settings") && (
          <GuardedLink
            href="/settings/appearance"
            onClick={onMobileClose}
            title={showNarrow ? t("nav.settings") : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-colors cursor-pointer w-full",
              showNarrow ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              pathname.startsWith("/settings")
                ? "bg-accent/15 text-accent font-medium"
                : "text-muted hover:bg-[var(--hover-bg)] hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!showNarrow && <span>{t("nav.settings")}</span>}
          </GuardedLink>
        )}
        {hasAdminAccess && (
          <GuardedLink
            href="/admin"
            onClick={onMobileClose}
            title={showNarrow ? t("nav.admin") : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm transition-colors cursor-pointer w-full",
              showNarrow ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              pathname.startsWith("/admin")
                ? "bg-accent/15 text-accent font-medium"
                : "text-muted hover:bg-[var(--hover-bg)] hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!showNarrow && <span>{t("nav.admin")}</span>}
          </GuardedLink>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title={showNarrow ? t("action.signOut") : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm transition-colors cursor-pointer w-full text-muted hover:bg-[var(--hover-bg)] hover:text-red-500 disabled:opacity-60",
            showNarrow ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
          )}
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" />
          )}
          {!showNarrow && <span>{t("action.signOut")}</span>}
        </button>
      </div>

      {resizable && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={handleResizeStart}
          className="absolute top-0 end-0 z-10 hidden h-full w-1.5 cursor-col-resize touch-none hover:bg-accent/30 active:bg-accent/40 lg:block"
        />
      )}
    </aside>
  );
}
