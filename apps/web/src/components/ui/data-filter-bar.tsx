"use client";

/**
 * @deprecated Prefer `ManagementToolbar`, `SearchField`, `FilterSelect`,
 * and `ActiveFilters` from `@/components/management`.
 */
export {
  SearchField as DataFilterBarSearch,
  FilterSelect,
  ActiveFilters,
} from "@/components/management";

import {
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  ActiveFilters,
  type ActiveFilterChip,
} from "@/components/management";
import { cn } from "@/lib/utils";

/** Legacy filter bar adapter — prefer ManagementToolbar. */
export function DataFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  chips = [],
  onRemoveChip,
  onClearAll,
  activeFilterCount = 0,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  chips?: ActiveFilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
  activeFilterCount?: number;
  className?: string;
}) {
  void activeFilterCount;
  return (
    <ManagementToolbar className={cn(className)}>
      <ManagementToolbarRow>
        {onSearchChange !== undefined ? (
          <SearchField
            value={search ?? ""}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        ) : null}
        {children}
      </ManagementToolbarRow>
      <ActiveFilters chips={chips} onRemove={onRemoveChip} onClearAll={onClearAll} />
    </ManagementToolbar>
  );
}
