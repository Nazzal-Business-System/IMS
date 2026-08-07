"use client";

import { useState } from "react";
import type { NotificationCategory, NotificationType } from "@ims/shared-types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronDown, Filter, Search, X } from "lucide-react";
import { DateRangePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type NotificationReadFilter = "all" | "unread" | "read";

export interface NotificationFiltersState {
  search: string;
  readFilter: NotificationReadFilter;
  category: NotificationCategory | "";
  type: NotificationType | "";
  fromDate: string;
  toDate: string;
}

export const EMPTY_NOTIFICATION_FILTERS: NotificationFiltersState = {
  search: "",
  readFilter: "all",
  category: "",
  type: "",
  fromDate: "",
  toDate: "",
};

interface NotificationFilterToolbarProps {
  filters: NotificationFiltersState;
  onChange: (next: NotificationFiltersState) => void;
  onClear: () => void;
  className?: string;
}

type FilterOption<T extends string> = { value: T; label: string };

const controlSurface =
  "h-10 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-sm text-foreground " +
  "transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "motion-reduce:transition-none";

const controlActive =
  "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent " +
  "hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

function FilterSelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const { dir } = useI18n();
  const selected = options.find((o) => o.value === value) ?? options[0];
  const isActive = value !== options[0]?.value;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            controlSurface,
            "inline-flex min-w-0 cursor-pointer items-center gap-1.5 px-3",
            isActive && controlActive,
            className
          )}
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={dir === "rtl" ? "end" : "start"}
          sideOffset={6}
          className={cn(
            "z-[80] min-w-[11rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
            "bg-[var(--popover)] p-1 shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "motion-reduce:animate-none"
          )}
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm outline-none",
                "data-[highlighted]:bg-[var(--hover-bg)]"
              )}
              onSelect={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
              ) : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function FilterControls({
  filters,
  onChange,
  layout = "toolbar",
}: {
  filters: NotificationFiltersState;
  onChange: (next: NotificationFiltersState) => void;
  layout?: "toolbar" | "sheet";
}) {
  const { t } = useI18n();
  const patch = (partial: Partial<NotificationFiltersState>) =>
    onChange({ ...filters, ...partial });

  const statusOptions: FilterOption<NotificationReadFilter>[] = [
    { value: "all", label: t("notifications.filter.all") },
    { value: "unread", label: t("notifications.filter.unread") },
    { value: "read", label: t("notifications.filter.read") },
  ];

  const categoryOptions: FilterOption<NotificationCategory | "">[] = [
    { value: "", label: t("notifications.filter.allCategories") },
    { value: "inventory", label: t("notifications.category.inventory") },
    { value: "stock", label: t("notifications.category.stock") },
    { value: "purchase_order", label: t("notifications.category.purchase_order") },
    { value: "user", label: t("notifications.category.user") },
    { value: "permission", label: t("notifications.category.permission") },
    { value: "system", label: t("notifications.category.system") },
  ];

  const typeOptions: FilterOption<NotificationType | "">[] = [
    { value: "", label: t("notifications.filter.allTypes") },
    { value: "info", label: t("notifications.type.info") },
    { value: "success", label: t("notifications.type.success") },
    { value: "warning", label: t("notifications.type.warning") },
    { value: "error", label: t("notifications.type.error") },
  ];

  const stack = layout === "sheet";

  return (
    <div
      className={cn(
        stack
          ? "flex flex-col gap-2.5"
          : "flex min-w-0 flex-1 flex-wrap items-center gap-2"
      )}
    >
      <FilterSelectMenu
        label={t("notifications.filter.all")}
        value={filters.readFilter}
        options={statusOptions}
        onChange={(readFilter) => patch({ readFilter })}
        className={stack ? "w-full justify-between" : "max-w-[11rem]"}
      />
      <FilterSelectMenu
        label={t("notifications.filter.allCategories")}
        value={filters.category}
        options={categoryOptions}
        onChange={(category) => patch({ category })}
        className={stack ? "w-full justify-between" : "max-w-[12rem]"}
      />
      <FilterSelectMenu
        label={t("notifications.filter.allTypes")}
        value={filters.type}
        options={typeOptions}
        onChange={(type) => patch({ type })}
        className={stack ? "w-full justify-between" : "max-w-[10rem]"}
      />
      <DateRangePicker
        from={filters.fromDate || null}
        to={filters.toDate || null}
        onChange={({ from, to }) =>
          patch({ fromDate: from ?? "", toDate: to ?? "" })
        }
        placeholder={t("notifications.filter.dateRange")}
        aria-label={t("notifications.filter.dateRange")}
        className={stack ? "w-full" : undefined}
        triggerClassName={cn(
          "w-full max-w-full",
          stack ? "justify-between" : "max-w-[16rem]",
          (filters.fromDate || filters.toDate) && controlActive
        )}
      />
    </div>
  );
}

export function NotificationFilterToolbar({
  filters,
  onChange,
  onClear,
  className,
}: NotificationFilterToolbarProps) {
  const { t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount =
    (filters.readFilter !== "all" ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.fromDate || filters.toDate ? 1 : 0) +
    (filters.search.trim() ? 1 : 0);

  const hasActive = activeCount > 0;
  const sheetFilterCount =
    (filters.readFilter !== "all" ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.fromDate || filters.toDate ? 1 : 0);

  return (
    <div
      className={cn("notification-filter-toolbar space-y-2", className)}
      role="search"
      aria-label={t("notifications.filters")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-[14rem]">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={t("notifications.searchPlaceholder")}
            aria-label={t("notifications.searchPlaceholder")}
            className={cn(
              controlSurface,
              "w-full border-0 pe-3 ps-9 placeholder:text-muted"
            )}
          />
        </div>

        <div className="hidden min-w-0 flex-[2] items-center gap-2 md:flex">
          <FilterControls filters={filters} onChange={onChange} />
        </div>

        <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className={cn(
                controlSurface,
                "inline-flex cursor-pointer items-center gap-2 px-3 md:hidden",
                sheetFilterCount > 0 && controlActive
              )}
              aria-label={t("notifications.filters")}
            >
              <Filter className="h-4 w-4" aria-hidden />
              <span>{t("notifications.filters")}</span>
              {sheetFilterCount > 0 ? (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                  {sheetFilterCount}
                </span>
              ) : null}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
            <Dialog.Content
              className={cn(
                "fixed inset-x-0 bottom-0 z-[71] max-h-[min(85vh,36rem)] overflow-y-auto",
                "rounded-t-2xl border-0 bg-[var(--card)] p-4 shadow-2xl outline-none",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4",
                "motion-reduce:animate-none"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Dialog.Title className="text-base font-semibold text-foreground">
                  {t("notifications.filters")}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={t("notifications.filters")}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>
              <FilterControls filters={filters} onChange={onChange} layout="sheet" />
              <div className="mt-4 flex gap-2">
                {hasActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 flex-1 cursor-pointer"
                    onClick={() => {
                      onClear();
                      setSheetOpen(false);
                    }}
                  >
                    {t("notifications.clearFilters")}
                  </Button>
                ) : null}
                <Dialog.Close asChild>
                  <Button type="button" className="h-10 flex-1 cursor-pointer">
                    {t("datePicker.apply")}
                  </Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {hasActive ? (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              controlSurface,
              "inline-flex cursor-pointer items-center gap-1.5 px-2.5 text-muted hover:text-foreground"
            )}
            aria-label={t("notifications.clearFilters")}
            title={t("notifications.clearFilters")}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t("notifications.clearFilters")}</span>
            <span className="sr-only sm:not-sr-only sm:hidden">
              {t("notifications.filter.activeCount", { count: activeCount })}
            </span>
          </button>
        ) : null}
      </div>

      {hasActive ? (
        <p className="text-xs text-muted" aria-live="polite">
          {t("notifications.filter.activeCount", { count: activeCount })}
        </p>
      ) : null}
    </div>
  );
}
