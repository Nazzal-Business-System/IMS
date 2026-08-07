"use client";

import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Locale direction for the auth page root (form/toolbar/footer). */
  dir?: "ltr" | "rtl";
}

/**
 * Viewport-fitting auth frame. Artwork column uses the hero aspect ratio
 * (1448×1086 ≈ 4:3) so object-contain never crops. Footer attaches below
 * the shell so it does not steal height from the artwork/form columns.
 */
export function AuthShell({ children, footer, className, dir }: AuthShellProps) {
  return (
    <div
      dir={dir}
      className={cn(
        "auth-page relative min-h-[100dvh] overflow-x-hidden",
        className
      )}
      style={{ backgroundColor: "var(--auth-page-bg)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 50% 42%, var(--auth-page-glow) 0%, transparent 60%)",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col justify-center",
          /* Tablet/mobile: compact centered auth surface; desktop: wide two-column shell */
          "max-w-[min(28rem,calc(100vw-1.25rem))]",
          "px-2.5 py-2.5",
          "lg:max-w-[min(1280px,calc(100vw-2.5rem))] lg:px-0 lg:py-3"
        )}
      >
        <div
          className={cn(
            "auth-shell flex w-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border",
            /* Cap height so footer + shell fit; short viewports may page-scroll. */
            "lg:h-[min(720px,calc(100dvh-3.75rem))]"
          )}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
