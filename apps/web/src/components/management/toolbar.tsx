"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Check, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function ManagementToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ims-mgmt-toolbar flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-3 sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ManagementToolbarRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("action.search")}
        aria-label={placeholder ?? t("filter.search")}
        className={cn(
          "ims-filter-control h-10 w-full rounded-lg border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--input-bg)] pe-3 ps-9 text-sm text-foreground",
          "cursor-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  children,
  className,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-muted",
        className
      )}
    >
      <span className="shrink-0">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ims-filter-control h-10 w-full min-w-[8.5rem] cursor-pointer appearance-none rounded-lg border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--input-bg)] bg-[length:1rem] bg-[position:right_0.65rem_center] bg-no-repeat px-2.5 pe-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rtl:bg-[position:left_0.65rem_center] rtl:ps-8 rtl:pe-2.5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        }}
      >
        {children}
      </select>
    </label>
  );
}

function sanitizeNumericInput(raw: string, allowDecimal: boolean) {
  let next = raw.replace(allowDecimal ? /[^\d.]/g : /\D/g, "");
  if (allowDecimal) {
    const firstDot = next.indexOf(".");
    if (firstDot !== -1) {
      next =
        next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return next;
}

function useDebouncedFilterValue(
  value: string,
  onChange: (value: string) => void,
  delayMs = 250
) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (local !== value) onChange(local);
    }, delayMs);
    return () => window.clearTimeout(handle);
  }, [local, onChange, value, delayMs]);

  return [local, setLocal] as const;
}

export function NumericFilterField({
  label,
  value,
  onChange,
  placeholder,
  allowDecimal = false,
  className,
  id,
  minWidthClass = "w-[7.5rem]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowDecimal?: boolean;
  className?: string;
  id?: string;
  minWidthClass?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [local, setLocal] = useDebouncedFilterValue(value, onChange);

  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-muted", className)}>
      <span className="shrink-0">{label}</span>
      <input
        id={fieldId}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        pattern={allowDecimal ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
        autoComplete="off"
        value={local}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => setLocal(sanitizeNumericInput(e.target.value, allowDecimal))}
        className={cn(
          "ims-filter-control ims-numeric-filter h-10 rounded-lg border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--input-bg)] px-2.5 text-sm text-foreground tabular-nums",
          "cursor-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          local && "border-accent/35",
          minWidthClass
        )}
      />
    </label>
  );
}

export function NumericRangeFilter({
  groupLabel,
  minPlaceholder,
  maxPlaceholder,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  allowDecimal = false,
  className,
  /** @deprecated Prefer groupLabel + placeholders */
  minLabel,
  /** @deprecated Prefer groupLabel + placeholders */
  maxLabel,
}: {
  groupLabel?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  allowDecimal?: boolean;
  className?: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  const { t } = useI18n();
  const minId = useId();
  const maxId = useId();
  const [localMin, setLocalMin] = useDebouncedFilterValue(minValue, onMinChange);
  const [localMax, setLocalMax] = useDebouncedFilterValue(maxValue, onMaxChange);
  const hasValue = Boolean(localMin || localMax);
  const invalidRange =
    localMin !== "" &&
    localMax !== "" &&
    Number(localMin) > Number(localMax);
  const resolvedGroup = groupLabel ?? minLabel ?? maxLabel ?? "";
  const minPh = minPlaceholder ?? minLabel ?? "";
  const maxPh = maxPlaceholder ?? maxLabel ?? "";

  return (
    <div className={cn("flex min-w-[14rem] flex-col gap-1", className)}>
      {resolvedGroup ? (
        <span className="text-xs font-medium text-muted">{resolvedGroup}</span>
      ) : null}
      <div
        className={cn(
          "ims-filter-control flex h-10 items-stretch overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--input-bg)]",
          "focus-within:ring-2 focus-within:ring-accent",
          hasValue && "border-accent/35",
          invalidRange && "border-destructive/50 focus-within:ring-destructive"
        )}
      >
        <label className="sr-only" htmlFor={minId}>
          {minPh || resolvedGroup}
        </label>
        <input
          id={minId}
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          pattern={allowDecimal ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
          autoComplete="off"
          value={localMin}
          placeholder={minPh}
          aria-invalid={invalidRange || undefined}
          onChange={(e) => setLocalMin(sanitizeNumericInput(e.target.value, allowDecimal))}
          className="ims-numeric-filter h-full min-w-0 flex-1 cursor-text bg-transparent px-2.5 text-sm text-foreground tabular-nums placeholder:text-muted focus-visible:outline-none"
        />
        <span
          className="flex shrink-0 items-center px-1 text-sm text-muted"
          aria-hidden
        >
          –
        </span>
        <label className="sr-only" htmlFor={maxId}>
          {maxPh || resolvedGroup}
        </label>
        <input
          id={maxId}
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          pattern={allowDecimal ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
          autoComplete="off"
          value={localMax}
          placeholder={maxPh}
          aria-invalid={invalidRange || undefined}
          onChange={(e) => setLocalMax(sanitizeNumericInput(e.target.value, allowDecimal))}
          className="ims-numeric-filter h-full min-w-0 flex-1 cursor-text bg-transparent px-2.5 text-sm text-foreground tabular-nums placeholder:text-muted focus-visible:outline-none"
        />
      </div>
      {invalidRange ? (
        <span className="text-[0.6875rem] text-destructive" role="alert">
          {t("filter.invalidRange")}
        </span>
      ) : null}
    </div>
  );
}

export function FilterToggle({
  pressed,
  onPressedChange,
  label,
  icon,
  className,
  disabled,
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "ims-filter-toggle inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-amber-500/45 bg-amber-500/12 text-foreground"
          : "border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--input-bg)] text-muted hover:bg-[var(--hover-bg)] hover:text-foreground",
        className
      )}
    >
      {icon ?? <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
      <span>{label}</span>
      {pressed ? <Check className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden /> : null}
    </button>
  );
}

export type ActiveFilterChip = { key: string; label: string };

export function ActiveFilters({
  chips,
  onRemove,
  onClearAll,
  className,
}: {
  chips: ActiveFilterChip[];
  onRemove?: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  if (!chips.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove?.(chip.key)}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-[var(--muted-bg)]/60 px-2.5 text-xs text-foreground transition-colors hover:bg-[var(--hover-bg)]"
        >
          {chip.label}
          <X className="h-3 w-3 text-muted" aria-hidden />
          <span className="sr-only">{t("action.clearFilters")}</span>
        </button>
      ))}
      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted"
          onClick={onClearAll}
        >
          {t("action.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}

export function MobileFilterTrigger({
  activeCount,
  onClick,
  className,
}: {
  activeCount?: number;
  onClick: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Button
      type="button"
      variant="secondary"
      className={cn("h-10 gap-2 lg:hidden", className)}
      onClick={onClick}
      aria-label={t("filter.filters")}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      {t("filter.filters")}
      {activeCount && activeCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-foreground">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}
