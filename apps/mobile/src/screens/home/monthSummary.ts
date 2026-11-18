import type { LedgerTransaction } from '../../database/models/transaction';
import { MONTH_NAMES } from '../../utils/dates';

export type MonthKey = { year: number; month: number };

export type MonthSummary = {
  incomePaise: number;
  expensePaise: number;
  /** income - expense. Negative when the user spent more than they earned. */
  remainingPaise: number;
};


/** Current calendar month in India time. */
export function currentMonthKey(now: Date): MonthKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  return { year: get('year'), month: get('month') };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const index = key.year * 12 + (key.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function isSameMonth(left: MonthKey, right: MonthKey): boolean {
  return left.year === right.year && left.month === right.month;
}

export function monthLabel(key: MonthKey): string {
  return `${MONTH_NAMES[key.month - 1]} ${key.year}`;
}

function monthStartIso(key: MonthKey): string {
  const month = String(key.month).padStart(2, '0');
  return new Date(`${key.year}-${month}-01T00:00:00+05:30`).toISOString();
}

/** Inclusive UTC ISO range covering the whole month in India time. */
export function monthRange(key: MonthKey): { from: string; to: string } {
  const nextStart = new Date(monthStartIso(shiftMonth(key, 1)));
  return {
    from: monthStartIso(key),
    to: new Date(nextStart.getTime() - 1).toISOString(),
  };
}

export function summarize(transactions: Pick<LedgerTransaction, 'type' | 'amountPaise'>[]): MonthSummary {
  let incomePaise = 0;
  let expensePaise = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') incomePaise += transaction.amountPaise;
    else expensePaise += transaction.amountPaise;
  }
  return { incomePaise, expensePaise, remainingPaise: incomePaise - expensePaise };
}

export { formatRupees, formatSignedRupees } from '../../utils/money';

/** Inclusive UTC ISO range covering the whole calendar year in India time. */
export function yearRange(year: number): { from: string; to: string } {
  return {
    from: monthRange({ year, month: 1 }).from,
    to: monthRange({ year, month: 12 }).to,
  };
}

export type MonthBreakdownRow = MonthSummary & { month: MonthKey; label: string };

/**
 * Per-month totals for a year. `dateGroup` is the India-time YYYY-MM-DD key
 * produced by the repository. For the current year, months after `upTo` are omitted.
 */
export function monthlyBreakdown(
  transactions: Pick<LedgerTransaction, 'type' | 'amountPaise' | 'dateGroup'>[],
  year: number,
  upTo?: MonthKey,
): MonthBreakdownRow[] {
  const lastMonth = upTo && upTo.year === year ? upTo.month : 12;
  const rows: MonthBreakdownRow[] = [];
  for (let month = 1; month <= lastMonth; month += 1) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const summary = summarize(transactions.filter(item => item.dateGroup.startsWith(prefix)));
    rows.push({ ...summary, month: { year, month }, label: MONTH_NAMES[month - 1].slice(0, 3) });
  }
  return rows;
}
