"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useI18n } from "@/lib/i18n";

const SETTLE_MS = 350;

export function NavigationProgress() {
  const pathname = usePathname();
  const { isNavigating } = useNavigationLoading();
  const isMutating = useIsMutating();
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    setSettling(true);
    const timer = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Progress bar covers route nav + brief settle; mutations keep the bar only (no overlay).
  const showBar = isNavigating || settling || isMutating > 0;

  if (!showBar) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[200] h-[3px] overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy="true"
      aria-label="Navigation progress"
    >
      <div
        className="h-full w-1/4 bg-accent route-progress-bar"
        style={{ animationDuration: isMutating > 0 && !isNavigating ? "0.8s" : "0.55s" }}
      />
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="mt-4 text-sm text-muted">{message ?? t("loading")}</p>
    </div>
  );
}
