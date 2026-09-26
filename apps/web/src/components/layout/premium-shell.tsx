"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ShellSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "./demo-banner";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import { showDemoBanner } from "@/lib/demo-mode";

const SIDEBAR_COLLAPSED_KEY = "ims_sidebar_collapsed";
const SIDEBAR_WIDTH_KEY = "ims_sidebar_width";
const SIDEBAR_MIN = 72;
const SIDEBAR_MIN_EXPANDED = 200;
const SIDEBAR_DEFAULT = 260;
const SIDEBAR_MAX = 340;

function clampWidth(value: number) {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN_EXPANDED, value));
}

export function PremiumShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (storedCollapsed === "true") setCollapsed(true);

    const storedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (storedWidth) {
      const parsed = parseInt(storedWidth, 10);
      if (!Number.isNaN(parsed)) setSidebarWidth(clampWidth(parsed));
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const toggleCollapsed = () => {
    setSidebarHover(false);
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const handleSidebarWidthChange = useCallback((width: number) => {
    const next = clampWidth(width);
    setSidebarWidth(next);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
  }, []);

  if (loading || !hydrated) return <ShellSkeleton />;
  if (!user) return <ShellSkeleton />;

  const showNarrow = collapsed && !sidebarHover;
  const effectiveWidth = showNarrow ? SIDEBAR_MIN : sidebarWidth;

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="relative lg:hidden">
        <SidebarNav
          widthPx={SIDEBAR_DEFAULT}
          collapsed={false}
          resizable={false}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="fixed end-3 top-3 z-[60] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="hidden lg:block">
        <SidebarNav
          widthPx={effectiveWidth}
          collapsed={collapsed}
          hoverExpanded={sidebarHover}
          resizable={!showNarrow}
          onSidebarMouseEnter={() => {
            if (collapsed) setSidebarHover(true);
          }}
          onSidebarMouseLeave={() => setSidebarHover(false)}
          onWidthChange={handleSidebarWidthChange}
        />
      </div>

      <div
        className="flex min-h-screen flex-col transition-[padding] duration-300 ease-out max-lg:ps-0 lg:ps-[var(--sidebar-width)]"
        style={{ "--sidebar-width": `${effectiveWidth}px` } as React.CSSProperties}
      >
        <Topbar
          sidebarCollapsed={collapsed}
          onSidebarToggle={toggleCollapsed}
          onMenuClick={() => setMobileOpen(true)}
        />
        {showDemoBanner() ? <DemoBanner /> : null}
        <main className="density-pad flex-1 p-4 lg:p-6">
          <div className="ims-mgmt-content mx-auto w-full max-w-[90rem]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
