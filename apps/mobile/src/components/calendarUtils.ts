/** Pure helpers for the calendar picker. All dates are calendar dates as YYYY-MM-DD. */

import { MONTH_NAMES, SHORT_MONTH_NAMES } from '../utils/dates';

/** Monday-first week, as used on Indian calendars. */
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export { SHORT_MONTH_NAMES };


export type CalendarMonth = { year: number; month: number };

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateString(value: string): CalendarMonth & { day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function shiftCalendarMonth(value: CalendarMonth, delta: number): CalendarMonth {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function calendarMonthLabel(value: CalendarMonth): string {
  return `${MONTH_NAMES[value.month - 1]} ${value.year}`;
}

/** Weeks (Monday first) of a month. Empty cells before day 1 and after the last day are null. */
export function buildMonthGrid(value: CalendarMonth): (string | null)[][] {
  // getUTCDay: 0 = Sunday. Convert so Monday = 0 ... Sunday = 6.
  const firstWeekday = (new Date(Date.UTC(value.year, value.month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(value.year, value.month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toDateString(value.year, value.month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/** True when `value` is after `max` (month granularity). */
export function isMonthAfter(value: CalendarMonth, max: CalendarMonth): boolean {
  return value.year > max.year || (value.year === max.year && value.month > max.month);
}
