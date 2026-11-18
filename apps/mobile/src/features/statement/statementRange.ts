import { formatShortDate, MONTH_NAMES } from '../../utils/dates';

/** Inclusive calendar range in India time, both ends as YYYY-MM-DD. */
export type DateRange = { from: string; to: string };

export type RangePreset = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

export const PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear', label: 'This year' },
  { id: 'lastYear', label: 'Last year' },
];

type Parts = { year: number; month: number; day: number };

function parts(date: string): Parts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function make(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  return make(year, month, day + days);
}

/** Ranges never reach past today: a statement can't contain the future. */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: string): DateRange {
  const { year, month } = parts(today);
  switch (preset) {
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'thisMonth':
      return { from: make(year, month, 1), to: today };
    case 'lastMonth': {
      const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
      return { from: make(previous.year, previous.month, 1), to: make(previous.year, previous.month, lastDayOfMonth(previous.year, previous.month)) };
    }
    case 'thisYear':
      return { from: make(year, 1, 1), to: today };
    case 'lastYear':
      return { from: make(year - 1, 1, 1), to: make(year - 1, 12, 31) };
  }
}

/** Which preset (if any) a range matches, so the right chip stays highlighted. */
export function matchPreset(range: DateRange, today: string): RangePreset {
  const hit = PRESETS.find(preset => {
    const candidate = presetRange(preset.id, today);
    return candidate.from === range.from && candidate.to === range.to;
  });
  return hit?.id ?? 'custom';
}

/** Keeps from ≤ to ≤ today. */
export function normalizeRange(range: DateRange, today: string): DateRange {
  const to = range.to > today ? today : range.to;
  const from = range.from > to ? to : range.from;
  return { from, to };
}

/** UTC ISO bounds covering the whole range in India time, for the repository query. */
export function rangeToIso(range: DateRange): { from: string; to: string } {
  return {
    from: new Date(`${range.from}T00:00:00.000+05:30`).toISOString(),
    to: new Date(`${range.to}T23:59:59.999+05:30`).toISOString(),
  };
}

export function dayCount(range: DateRange): number {
  const from = parts(range.from);
  const to = parts(range.to);
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000) + 1;
}

/** Calendar months touched by the range, oldest first. */
export function monthsInRange(range: DateRange): { year: number; month: number }[] {
  const from = parts(range.from);
  const to = parts(range.to);
  const months: { year: number; month: number }[] = [];
  for (let index = from.year * 12 + from.month - 1; index <= to.year * 12 + to.month - 1; index += 1) {
    months.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }
  return months;
}

function isWholeMonth(range: DateRange) {
  const from = parts(range.from);
  const to = parts(range.to);
  return from.day === 1 && from.year === to.year && from.month === to.month && to.day === lastDayOfMonth(to.year, to.month);
}

function isWholeYear(range: DateRange) {
  const from = parts(range.from);
  const to = parts(range.to);
  return from.year === to.year && from.month === 1 && from.day === 1 && to.month === 12 && to.day === 31;
}

/** "October 2026", "2025", or "8 Nov – 18 Nov 2026". */
export function rangeTitle(range: DateRange): string {
  const from = parts(range.from);
  if (isWholeMonth(range)) return `${MONTH_NAMES[from.month - 1]} ${from.year}`;
  if (isWholeYear(range)) return String(from.year);
  if (range.from === range.to) return formatShortDate(range.from);
  const to = parts(range.to);
  const start = from.year === to.year ? formatShortDate(range.from).replace(` ${from.year}`, '') : formatShortDate(range.from);
  return `${start} – ${formatShortDate(range.to)}`;
}

/** File name without extension, e.g. "Kharchiva-Statement-2026-10" or "Kharchiva-Statement-2026-11-08_to_2026-11-18". */
export function rangeFileName(range: DateRange): string {
  const from = parts(range.from);
  if (isWholeMonth(range)) return `Kharchiva-Statement-${from.year}-${String(from.month).padStart(2, '0')}`;
  if (isWholeYear(range)) return `Kharchiva-Statement-${from.year}`;
  return range.from === range.to ? `Kharchiva-Statement-${range.from}` : `Kharchiva-Statement-${range.from}_to_${range.to}`;
}
