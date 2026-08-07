"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  /** Show compact spinner when this link's navigation is pending. */
  showPending?: boolean;
};

export function GuardedLink({
  href,
  onClick,
  showPending = false,
  className,
  children,
  ...props
}: GuardedLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation, isPendingHref } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();

  const hrefString = typeof href === "string" ? href : href.pathname ?? "";
  const pending = showPending && Boolean(hrefString) && isPendingHref(hrefString);

  return (
    <Link
      href={href}
      {...props}
      aria-busy={pending || undefined}
      className={cn(pending && "pointer-events-none opacity-80", className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;

        const target = e.currentTarget.getAttribute("target");
        if (target && target !== "_self") return;

        if (!hrefString || hrefString === pathname) return;

        e.preventDefault();
        requestNavigation(() => {
          startNavigation(hrefString);
          router.push(hrefString);
        });
      }}
      onMouseEnter={() => {
        if (hrefString && hrefString !== pathname) router.prefetch(hrefString);
      }}
      onFocus={() => {
        if (hrefString && hrefString !== pathname) router.prefetch(hrefString);
      }}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
