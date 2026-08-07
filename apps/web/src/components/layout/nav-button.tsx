"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

export type NavButtonProps = Omit<ButtonProps, "asChild" | "onClick"> & {
  href: string;
  /** Accessible name while pending (defaults to Opening…). */
  pendingLabel?: string;
  /** Visible label while pending; keep similar length to avoid layout jump. */
  pendingText?: string;
  icon?: ReactNode;
  children: ReactNode;
};

/**
 * Route-navigation button with scoped pending feedback.
 * Separate from mutation loaders (Save / Upload / etc.).
 */
export function NavButton({
  href,
  pendingLabel,
  pendingText,
  icon,
  children,
  disabled,
  className,
  ...props
}: NavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation, isPendingHref, isNavigating, pendingHref } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();
  const { t } = useI18n();

  const pending = isPendingHref(href);
  const openingLabel = pendingLabel ?? t("nav.opening");

  return (
    <Button
      type="button"
      {...props}
      className={cn("relative min-w-[8.5rem]", className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      aria-label={pending ? openingLabel : undefined}
      onMouseEnter={() => {
        if (href !== pathname) router.prefetch(href);
      }}
      onFocus={() => {
        if (href !== pathname) router.prefetch(href);
      }}
      onClick={() => {
        if (href === pathname) return;
        if (isNavigating && pendingHref === href) return;
        requestNavigation(() => {
          startNavigation(href);
          router.push(href);
        });
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span className="truncate">{pendingText ?? children}</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}
