"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type RowActionItem = {
  key: string;
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
  /** Shown to assistive tech when disabled. */
  disabledReason?: string;
};

export function RowActionMenu({
  actions,
  label,
  className,
}: {
  actions: RowActionItem[];
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 shrink-0 text-muted hover:text-foreground", className)}
          aria-label={label ?? t("table.actions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{label ?? t("table.actions")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visible.map((action) => (
          <DropdownMenuItem
            key={action.key}
            disabled={action.disabled}
            destructive={action.destructive}
            title={action.disabled ? action.disabledReason : undefined}
            onSelect={(e) => {
              if (action.disabled) {
                e.preventDefault();
                return;
              }
              action.onSelect();
            }}
          >
            {action.icon}
            <span className="flex-1">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
