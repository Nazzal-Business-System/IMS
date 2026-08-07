"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  formatLocalDate,
  formatMonthYear,
  getWeekStartsOn,
  getWeekdayLabels,
  isDateInRange,
  parseLocalDate,
  startOfMonth,
  todayISODate,
  type ISODateString,
} from "@/components/date-picker/date-utils";

export type CalendarMode = "single" | "range";

export interface CalendarProps {
  mode?: CalendarMode;
  /** Selected single date (`YYYY-MM-DD`). */
  value?: ISODateString | null;
  /** Range selection. */
  rangeFrom?: ISODateString | null;
  rangeTo?: ISODateString | null;
  /** Draft hover end while selecting a range. */
  hoverDate?: ISODateString | null;
  onSelect?: (iso: ISODateString) => void;
  onHoverDate?: (iso: ISODateString | null) => void;
  minDate?: ISODateString | null;
  maxDate?: ISODateString | null;
  disabledDates?: (iso: ISODateString) => boolean;
  className?: string;
  /** Controlled visible month (1st of month). */
  viewMonth?: Date;
  onViewMonthChange?: (month: Date) => void;
}

function isDisabled(
  iso: ISODateString,
  minDate?: ISODateString | null,
  maxDate?: ISODateString | null,
  disabledDates?: (iso: ISODateString) => boolean
) {
  if (minDate && iso < minDate) return true;
  if (maxDate && iso > maxDate) return true;
  if (disabledDates?.(iso)) return true;
  return false;
}

export function Calendar({
  mode = "single",
  value = null,
  rangeFrom = null,
  rangeTo = null,
  hoverDate = null,
  onSelect,
  onHoverDate,
  minDate = null,
  maxDate = null,
  disabledDates,
  className,
  viewMonth: controlledView,
  onViewMonthChange,
}: CalendarProps) {
  const { t, language, dir } = useI18n();
  const locale = language === "ar" ? "ar" : "en-GB";
  const weekStartsOn = useMemo(() => getWeekStartsOn(locale), [locale]);
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, weekStartsOn),
    [locale, weekStartsOn]
  );

  const initialMonth = startOfMonth(
    value
      ? parseLocalDate(value)
      : rangeFrom
        ? parseLocalDate(rangeFrom)
        : rangeTo
          ? parseLocalDate(rangeTo)
          : new Date()
  );

  const [viewMonth, setViewMonthState] = useState(
    () => controlledView ?? initialMonth
  );

  useEffect(() => {
    if (!controlledView) return;
    const next = startOfMonth(controlledView);
    setViewMonthState((prev) =>
      prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth()
        ? prev
        : next
    );
  }, [controlledView]);

  const setViewMonth = (next: Date) => {
    const normalized = startOfMonth(next);
    setViewMonthState(normalized);
    onViewMonthChange?.(normalized);
  };

  const grid = useMemo(
    () => buildMonthGrid(viewMonth, weekStartsOn),
    [viewMonth, weekStartsOn]
  );

  const [focusIso, setFocusIso] = useState<ISODateString>(() => {
    return value ?? rangeFrom ?? rangeTo ?? todayISODate();
  });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setFocusIso(value);
    else if (rangeFrom) setFocusIso(rangeFrom);
  }, [value, rangeFrom]);

  const previewTo =
    mode === "range" && rangeFrom && !rangeTo && hoverDate ? hoverDate : rangeTo;

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const moveFocus = (delta: number) => {
    const current = parseLocalDate(focusIso);
    const next = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + delta
    );
    const iso = formatLocalDate(next);
    setFocusIso(iso);
    if (
      next.getMonth() !== viewMonth.getMonth() ||
      next.getFullYear() !== viewMonth.getFullYear()
    ) {
      setViewMonth(next);
    }
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-iso="${iso}"]`)
        ?.focus();
    });
  };

  return (
    <div className={cn("ims-calendar", className)} dir={dir}>
      <div className="ims-calendar-header">
        <button
          type="button"
          className="ims-calendar-nav"
          aria-label={t("datePicker.prevMonth")}
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setViewMonth(addMonths(viewMonth, -1));
          }}
        >
          <PrevIcon className="h-4 w-4" aria-hidden />
        </button>
        <p className="ims-calendar-title" aria-live="polite">
          {formatMonthYear(viewMonth, locale)}
        </p>
        <button
          type="button"
          className="ims-calendar-nav"
          aria-label={t("datePicker.nextMonth")}
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setViewMonth(addMonths(viewMonth, 1));
          }}
        >
          <NextIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="ims-calendar-weekdays" role="row">
        {weekdayLabels.map((label, index) => (
          <div
            key={`${index}-${label}`}
            className="ims-calendar-weekday"
            aria-hidden
          >
            {label}
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        className="ims-calendar-grid"
        role="grid"
        aria-label={formatMonthYear(viewMonth, locale)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveFocus(dir === "rtl" ? 1 : -1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveFocus(dir === "rtl" ? -1 : 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveFocus(-7);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveFocus(7);
          } else if (e.key === "Home") {
            e.preventDefault();
            moveFocus(-(parseLocalDate(focusIso).getDay() - weekStartsOn + 7) % 7);
          } else if (e.key === "End") {
            e.preventDefault();
            const offset = (parseLocalDate(focusIso).getDay() - weekStartsOn + 7) % 7;
            moveFocus(6 - offset);
          } else if (e.key === "PageUp") {
            e.preventDefault();
            setViewMonth(addMonths(viewMonth, e.shiftKey ? -12 : -1));
          } else if (e.key === "PageDown") {
            e.preventDefault();
            setViewMonth(addMonths(viewMonth, e.shiftKey ? 12 : 1));
          }
        }}
      >
        {grid.map((day) => {
          const disabled = isDisabled(day.iso, minDate, maxDate, disabledDates);
          const selectedSingle = mode === "single" && value === day.iso;
          const isStart = mode === "range" && rangeFrom === day.iso;
          const isEnd =
            mode === "range" &&
            (previewTo === day.iso || (!previewTo && rangeFrom === day.iso));
          const inRange =
            mode === "range" &&
            isDateInRange(day.iso, rangeFrom, previewTo) &&
            !isStart &&
            !isEnd;
          const selected = selectedSingle || isStart || isEnd;

          return (
            <button
              key={day.iso}
              type="button"
              data-iso={day.iso}
              disabled={disabled}
              tabIndex={day.iso === focusIso ? 0 : -1}
              aria-label={day.iso}
              aria-selected={selected || undefined}
              aria-current={day.isToday ? "date" : undefined}
              aria-disabled={disabled || undefined}
              onMouseEnter={() => {
                if (!disabled) onHoverDate?.(day.iso);
              }}
              onMouseLeave={() => onHoverDate?.(null)}
              onFocus={() => setFocusIso(day.iso)}
              onClick={() => {
                if (disabled) return;
                setFocusIso(day.iso);
                onSelect?.(day.iso);
              }}
              className={cn(
                "ims-calendar-day",
                "motion-reduce:transition-none",
                !day.inCurrentMonth && "text-muted/50",
                day.inCurrentMonth && !selected && !inRange && "text-foreground",
                day.isToday && !selected && "font-semibold text-accent",
                inRange &&
                  "rounded-none bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-foreground",
                isStart && previewTo && "rounded-e-none",
                isEnd &&
                  rangeFrom &&
                  previewTo &&
                  rangeFrom !== previewTo &&
                  "rounded-s-none",
                selected && "bg-accent font-semibold text-accent-foreground",
                !selected &&
                  !inRange &&
                  !disabled &&
                  "hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]",
                disabled && "opacity-35"
              )}
            >
              {day.date.getDate()}
              {day.isToday && !selected ? (
                <span
                  className="absolute bottom-1 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-accent"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
