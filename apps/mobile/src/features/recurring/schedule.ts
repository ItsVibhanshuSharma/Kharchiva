/** How often a recurring item repeats. */
export type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'MONTHLY', label: 'Har mahine' },
  { id: 'WEEKLY', label: 'Har hafte' },
  { id: 'YEARLY', label: 'Har saal' },
];

/** Never create more than this many back-dated entries in one go (e.g. after months away). */
export const MAX_CATCH_UP_OCCURRENCES = 12;

type Parts = { year: number; month: number; day: number };

function parts(date: string): Parts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function make(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The occurrence after `current`. Monthly and yearly items keep the start date's
 * day, clamped to short months: a 31st item lands on 30 Apr and 28/29 Feb, then
 * goes back to the 31st.
 */
export function nextOccurrence(current: string, anchor: string, frequency: Frequency): string {
  const now = parts(current);
  const start = parts(anchor);
  if (frequency === 'WEEKLY') return make(now.year, now.month, now.day + 7);
  if (frequency === 'MONTHLY') {
    const index = now.year * 12 + now.month; // month after `current`, 1-based month
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    return make(year, month, Math.min(start.day, lastDay(year, month)));
  }
  const year = now.year + 1;
  return make(year, start.month, Math.min(start.day, lastDay(year, start.month)));
}

/** Occurrences from `nextDate` up to and including `today`, oldest first, capped. */
export function dueOccurrences(
  nextDate: string,
  anchor: string,
  frequency: Frequency,
  today: string,
  cap = MAX_CATCH_UP_OCCURRENCES,
): { due: string[]; next: string } {
  const due: string[] = [];
  let cursor = nextDate;
  while (cursor <= today && due.length < cap) {
    due.push(cursor);
    cursor = nextOccurrence(cursor, anchor, frequency);
  }
  return { due, next: cursor };
}

export function frequencyLabel(frequency: Frequency): string {
  return FREQUENCIES.find(item => item.id === frequency)?.label ?? frequency;
}
