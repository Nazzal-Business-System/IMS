"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NotificationSkeletonProps {
  rows?: number;
  compact?: boolean;
  className?: string;
}

export function NotificationSkeleton({
  rows = 5,
  compact = false,
  className,
}: NotificationSkeletonProps) {
  return (
    <div
      className={cn("divide-y divide-[color-mix(in_srgb,var(--foreground)_8%,transparent)]", className)}
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn("flex gap-3 px-3", compact ? "py-2.5" : "py-3")}
        >
          <Skeleton className={cn("shrink-0 rounded-lg", compact ? "h-8 w-8" : "h-9 w-9")} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-[70%]" />
            <Skeleton className="h-3 w-full" />
            {!compact ? <Skeleton className="h-3 w-1/3" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
