"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/date-picker/calendar";
import {
  formatDisplayDate,
  parseLocalDate,
  startOfMonth,
  todayISODate,
  type ISODateString,
} from "@/components/date-picker/date-utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function useIsCompactViewport() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return compact;
}

const triggerClass =
  "inline-flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm " +
  "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-foreground " +
  "transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "motion-reduce:transition-none";

const panelClass =
  "ims-date-popover rounded-xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] " +
  "bg-[var(--popover)] p-3 shadow-xl outline-none";

export interface DatePickerProps {
  value: ISODateString | null | "";
  onChange: (value: ISODateString | null) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: ISODateString | null;
  maxDate?: ISODateString | null;
  className?: string;
  triggerClassName?: string;
  id?: string;
  "aria-label"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = true,
  minDate = null,
  maxDate = null,
  className,
  triggerClassName,
  id,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const { t, language, dir } = useI18n();
  const locale = language === "ar" ? "ar" : "en-GB";
  const compact = useIsCompactViewport();
  const [open, setOpen] = useState(false);
  const iso = value || null;
  const label = iso ? formatDisplayDate(iso, locale) : placeholder ?? t("datePicker.selectDate");
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(iso ? parseLocalDate(iso) : new Date())
  );

  useEffect(() => {
    if (!open) return;
    setViewMonth(startOfMonth(iso ? parseLocalDate(iso) : new Date()));
    // Seed month only when opening — avoid resetting while the user navigates months.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const body = (
    <DatePickerPanel
      value={iso}
      viewMonth={viewMonth}
      onViewMonthChange={setViewMonth}
      minDate={minDate}
      maxDate={maxDate}
      onSelect={(next) => {
        onChange(next);
        setOpen(false);
      }}
      onToday={() => {
        const today = todayISODate();
        onChange(today);
        setOpen(false);
      }}
      onClear={
        clearable
          ? () => {
              onChange(null);
              setOpen(false);
            }
          : undefined
      }
    />
  );

  const trigger = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      aria-label={ariaLabel ?? t("datePicker.selectDate")}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        triggerClass,
        iso && "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent",
        disabled && "cursor-not-allowed opacity-50",
        triggerClassName
      )}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className={cn("min-w-0 truncate", !iso && "text-muted")}>{label}</span>
      {clearable && iso ? (
        <span
          role="button"
          tabIndex={-1}
          className="ms-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:text-foreground"
          aria-label={t("datePicker.clear")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(null);
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
    </button>
  );

  return (
    <div className={cn("ims-date-picker", className)}>
      {compact ? (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
            <Dialog.Content
              className={cn(
                panelClass,
                "ims-date-popover--sheet",
                "fixed inset-x-0 bottom-0 z-[71] max-h-[min(90vh,34rem)] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4",
                "motion-reduce:animate-none"
              )}
            >
              <Dialog.Title className="sr-only">{t("datePicker.selectDate")}</Dialog.Title>
              {body}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        <DropdownMenu.Root open={open} onOpenChange={setOpen} modal>
          <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={dir === "rtl" ? "end" : "start"}
              sideOffset={8}
              collisionPadding={12}
              className={cn(
                panelClass,
                "z-[80]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                "motion-reduce:animate-none"
              )}
            >
              {body}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}

function DatePickerPanel({
  value,
  viewMonth,
  onViewMonthChange,
  minDate,
  maxDate,
  onSelect,
  onToday,
  onClear,
}: {
  value: ISODateString | null;
  viewMonth: Date;
  onViewMonthChange: (d: Date) => void;
  minDate: ISODateString | null;
  maxDate: ISODateString | null;
  onSelect: (iso: ISODateString) => void;
  onToday: () => void;
  onClear?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="ims-date-popover-body space-y-3" onKeyDown={(e) => e.stopPropagation()}>
      <Calendar
        mode="single"
        value={value}
        viewMonth={viewMonth}
        onViewMonthChange={onViewMonthChange}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={onSelect}
      />
      <div className="ims-date-popover-footer">
        {onClear ? (
          <button
            type="button"
            className="cursor-pointer text-xs text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={onClear}
          >
            {t("datePicker.clear")}
          </button>
        ) : (
          <span />
        )}
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onToday}>
          {t("datePicker.today")}
        </Button>
      </div>
    </div>
  );
}

export interface DateRangePickerProps {
  from: ISODateString | null | "";
  to: ISODateString | null | "";
  onChange: (next: { from: ISODateString | null; to: ISODateString | null }) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: ISODateString | null;
  maxDate?: ISODateString | null;
  className?: string;
  triggerClassName?: string;
  /** When true, commits as soon as both ends are chosen. Default true. */
  commitOnComplete?: boolean;
  "aria-label"?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder,
  disabled = false,
  clearable = true,
  minDate = null,
  maxDate = null,
  className,
  triggerClassName,
  commitOnComplete = true,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const { t, language, dir } = useI18n();
  const locale = language === "ar" ? "ar" : "en-GB";
  const compact = useIsCompactViewport();
  const [open, setOpen] = useState(false);
  const fromIso = from || null;
  const toIso = to || null;
  const active = Boolean(fromIso || toIso);

  const [draftFrom, setDraftFrom] = useState<ISODateString | null>(fromIso);
  const [draftTo, setDraftTo] = useState<ISODateString | null>(toIso);
  const [hoverDate, setHoverDate] = useState<ISODateString | null>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(
      fromIso ? parseLocalDate(fromIso) : toIso ? parseLocalDate(toIso) : new Date()
    )
  );
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setDraftFrom(fromIso);
    setDraftTo(toIso);
    setHoverDate(null);
    // Only seed the visible month when the popover opens — never on every parent render.
    setViewMonth(
      startOfMonth(
        fromIso ? parseLocalDate(fromIso) : toIso ? parseLocalDate(toIso) : new Date()
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync only on open
  }, [open]);

  const summary = (() => {
    if (fromIso && toIso) {
      return t("datePicker.rangeSummary", {
        from: formatDisplayDate(fromIso, locale),
        to: formatDisplayDate(toIso, locale),
      });
    }
    if (fromIso) {
      return t("datePicker.fromOnly", { from: formatDisplayDate(fromIso, locale) });
    }
    if (toIso) {
      return t("datePicker.toOnly", { to: formatDisplayDate(toIso, locale) });
    }
    return placeholder ?? t("datePicker.selectRange");
  })();

  const commit = (nextFrom: ISODateString | null, nextTo: ISODateString | null) => {
    onChange({ from: nextFrom, to: nextTo });
  };

  const handleSelect = (iso: ISODateString) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(iso);
      setDraftTo(null);
      return;
    }
    // Second click — normalize order
    let nextFrom = draftFrom;
    let nextTo = iso;
    if (iso < draftFrom) {
      nextFrom = iso;
      nextTo = draftFrom;
    }
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    if (commitOnComplete) {
      commit(nextFrom, nextTo);
      setOpen(false);
    }
  };

  const apply = () => {
    commit(draftFrom, draftTo);
    setOpen(false);
  };

  const clear = () => {
    setDraftFrom(null);
    setDraftTo(null);
    commit(null, null);
    setOpen(false);
  };

  const setToday = () => {
    const today = todayISODate();
    setDraftFrom(today);
    setDraftTo(today);
    commit(today, today);
    setOpen(false);
  };

  const body = (
    <div className="ims-date-popover-body space-y-3" onKeyDown={(e) => e.stopPropagation()}>
      <p id={titleId} className="ims-date-popover-status">
        {!draftFrom
          ? t("datePicker.pickStart")
          : !draftTo
            ? t("datePicker.pickEnd")
            : t("datePicker.rangeSummary", {
                from: formatDisplayDate(draftFrom, locale),
                to: formatDisplayDate(draftTo, locale),
              })}
      </p>
      <Calendar
        mode="range"
        rangeFrom={draftFrom}
        rangeTo={draftTo}
        hoverDate={hoverDate}
        onHoverDate={setHoverDate}
        viewMonth={viewMonth}
        onViewMonthChange={setViewMonth}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={handleSelect}
      />
      <div className="ims-date-popover-footer">
        <button
          type="button"
          className="cursor-pointer text-xs text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={clear}
        >
          {t("datePicker.clear")}
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={setToday}
          >
            {t("datePicker.today")}
          </Button>
          {!commitOnComplete ? (
            <Button type="button" size="sm" className="h-8 px-3" onClick={apply}>
              {t("datePicker.apply")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={
        active
          ? summary
          : ariaLabel ?? t("datePicker.selectRange")
      }
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        triggerClass,
        active && "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent",
        disabled && "cursor-not-allowed opacity-50",
        triggerClassName
      )}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className={cn("min-w-0 truncate", !active && "text-muted")}>{summary}</span>
      {clearable && active ? (
        <span
          role="button"
          tabIndex={-1}
          className="ms-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:text-foreground"
          aria-label={t("datePicker.clear")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commit(null, null);
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
    </button>
  );

  return (
    <div className={cn("ims-date-range-picker", className)}>
      {compact ? (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
            <Dialog.Content
              aria-labelledby={titleId}
              className={cn(
                panelClass,
                "ims-date-popover--sheet",
                "fixed inset-x-0 bottom-0 z-[71] max-h-[min(90vh,36rem)] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4",
                "motion-reduce:animate-none"
              )}
            >
              <Dialog.Title className="sr-only">{t("datePicker.selectRange")}</Dialog.Title>
              {body}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        <DropdownMenu.Root open={open} onOpenChange={setOpen} modal>
          <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={dir === "rtl" ? "end" : "start"}
              sideOffset={8}
              collisionPadding={12}
              className={cn(
                panelClass,
                "z-[80]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                "motion-reduce:animate-none"
              )}
            >
              {body}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}

/** Optional named aliases matching the requested architecture. */
export function DatePickerTrigger(props: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={props.className}>{props.children}</div>;
}

export function DateRangePopover(props: { children: ReactNode; className?: string }) {
  return <div className={cn(panelClass, props.className)}>{props.children}</div>;
}
