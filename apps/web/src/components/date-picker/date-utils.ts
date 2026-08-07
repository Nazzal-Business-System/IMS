/** Local calendar-date helpers. Values are always `YYYY-MM-DD` with no UTC day shift. */

export type ISODateString = string;

export interface DateRangeValue {
  from: ISODateString | null;
  to: ISODateString | null;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODateString(value: string | null | undefined): value is ISODateString {
  if (!value) return false;
  if (!ISO_DATE_RE.test(value)) return false;
  const date = parseLocalDate(value);
  return formatLocalDate(date) === value;
}

/** Parse `YYYY-MM-DD` as a local calendar date (never UTC midnight). */
export function parseLocalDate(value: ISODateString): Date {
  const match = ISO_DATE_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

/** Format a Date as local `YYYY-MM-DD`. */
export function formatLocalDate(date: Date): ISODateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISODate(): ISODateString {
  return formatLocalDate(new Date());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function compareISODate(a: ISODateString, b: ISODateString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function minISODate(a: ISODateString, b: ISODateString): ISODateString {
  return compareISODate(a, b) <= 0 ? a : b;
}

export function maxISODate(a: ISODateString, b: ISODateString): ISODateString {
  return compareISODate(a, b) >= 0 ? a : b;
}

export function normalizeRange(
  from: ISODateString | null,
  to: ISODateString | null
): DateRangeValue {
  if (from && to && compareISODate(from, to) > 0) {
    return { from: to, to: from };
  }
  return { from, to };
}

export function isDateInRange(
  value: ISODateString,
  from: ISODateString | null,
  to: ISODateString | null
): boolean {
  if (!from || !to) return false;
  const start = minISODate(from, to);
  const end = maxISODate(from, to);
  return compareISODate(value, start) >= 0 && compareISODate(value, end) <= 0;
}

/** Week starts on: 0=Sun … 6=Sat. Prefer locale weekInfo when available. */
export function getWeekStartsOn(locale: string): number {
  try {
    const loc = new Intl.Locale(locale);
    const weekInfo = (
      loc as Intl.Locale & { weekInfo?: { firstDay?: number } }
    ).weekInfo;
    const first = weekInfo?.firstDay;
    if (typeof first === "number") {
      // Spec: 1=Monday … 7=Sunday
      return first === 7 ? 0 : first;
    }
  } catch {
    // fall through
  }
  return locale.startsWith("ar") ? 6 : 0;
}

export function getWeekdayLabels(locale: string, weekStartsOn: number): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 2024-01-07 is a known Sunday
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + ((weekStartsOn + i) % 7));
    return formatter.format(day);
  });
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDisplayDate(value: ISODateString | null, locale: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(value));
}

export function formatDisplayRange(
  from: ISODateString | null,
  to: ISODateString | null,
  locale: string
): string {
  if (from && to) {
    const start = parseLocalDate(from);
    const end = parseLocalDate(to);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: sameYear ? undefined : "numeric",
    }).format(start);
    const endFmt = formatDisplayDate(to, locale);
    return `${startFmt} – ${endFmt}`;
  }
  if (from) return formatDisplayDate(from, locale);
  if (to) return formatDisplayDate(to, locale);
  return "";
}

export interface CalendarDayCell {
  iso: ISODateString;
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
}

/** 6x7 grid covering the visible month. */
export function buildMonthGrid(viewMonth: Date, weekStartsOn: number): CalendarDayCell[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const offset = (firstWeekday - weekStartsOn + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const today = todayISODate();

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const iso = formatLocalDate(date);
    return {
      iso,
      date,
      inCurrentMonth: date.getMonth() === month,
      isToday: iso === today,
    };
  });
}
