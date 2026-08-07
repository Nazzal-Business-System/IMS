"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  inactive: "secondary",
  discontinued: "warning",
  archived: "secondary",
  draft: "secondary",
  ordered: "default",
  received: "success",
  cancelled: "destructive",
  pending: "warning",
  completed: "success",
  in: "success",
  out: "warning",
  transfer: "default",
  adjustment: "secondary",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const variant = STATUS_VARIANTS[status.toLowerCase()] ?? "secondary";
  return (
    <Badge
      variant={variant}
      className={cn("max-w-full truncate whitespace-nowrap", className)}
    >
      {label}
    </Badge>
  );
}
