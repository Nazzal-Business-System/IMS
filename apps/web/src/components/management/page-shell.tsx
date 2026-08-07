"use client";

import { cn } from "@/lib/utils";

/** Full-width management page container with stable vertical rhythm. */
export function ManagementPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ims-mgmt-page flex min-h-0 flex-col gap-5", className)}>
      {children}
    </div>
  );
}
