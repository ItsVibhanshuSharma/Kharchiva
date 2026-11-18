import { formatShortDate } from '../../utils/dates';

/** How far back the catch-up card looks. Older gaps are left alone. */
export const LOOKBACK_DAYS = 7;

export type DayState = 'RECORDED' | 'NO_EXPENSE' | 'MISSING';

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon, 16 Nov" for a YYYY-MM-DD day. */
export function dayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${formatShortDate(date).replace(/ \d{4}$/, '')}`;
}

/** A day with entries is recorded; an explicit "nothing" is not a gap; anything else is missing. */
export function dayState(date: string, recorded: Set<string>, noExpense: Set<string>): DayState {
  if (recorded.has(date)) return 'RECORDED';
  if (noExpense.has(date)) return 'NO_EXPENSE';
  return 'MISSING';
}

/**
 * Past days (not today) that need attention, newest first. Days before the user's
 * first ever activity are never counted, so a new user is not told they are behind.
 */
export function missingDays(
  today: string,
  firstActiveDay: string | null,
  recorded: Set<string>,
  noExpense: Set<string>,
  lookback = LOOKBACK_DAYS,
): string[] {
  if (!firstActiveDay) return [];
  const days: string[] = [];
  for (let offset = 1; offset <= lookback; offset += 1) {
    const day = addDays(today, -offset);
    if (day < firstActiveDay) break;
    if (dayState(day, recorded, noExpense) === 'MISSING') days.push(day);
  }
  return days;
}

/** "18 / 20 din" style completeness for the month so far (PRD §23, informational only). */
export function monthCompleteness(
  today: string,
  firstActiveDay: string | null,
  recorded: Set<string>,
  noExpense: Set<string>,
): { covered: number; total: number } | null {
  if (!firstActiveDay) return null;
  const monthStart = `${today.slice(0, 8)}01`;
  const start = firstActiveDay > monthStart ? firstActiveDay : monthStart;
  let covered = 0;
  let total = 0;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    total += 1;
    if (dayState(day, recorded, noExpense) !== 'MISSING') covered += 1;
  }
  return total > 0 ? { covered, total } : null;
}
