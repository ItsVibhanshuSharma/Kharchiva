import type { LedgerTransaction } from '../../database/models/transaction';

export const OTHERS_LABEL = 'Baaki sab';

export type CategorySpend = {
  category: string;
  amountPaise: number;
  /** Whole percent of the period's total spend. */
  percent: number;
  /** 0–1, relative to the biggest row, for the bar width. */
  ratio: number;
  /** True for the grouped "everything else" row. */
  others: boolean;
};

/**
 * Expenses grouped by category, biggest first. Beyond `limit` rows the rest are
 * folded into one "Baaki sab" row so the card stays short.
 */
export function categoryBreakdown(
  transactions: Pick<LedgerTransaction, 'type' | 'category' | 'amountPaise'>[],
  limit = 5,
): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== 'expense') continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amountPaise);
  }
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const rows = sorted.length > limit ? sorted.slice(0, limit - 1) : sorted;
  const rest = sorted.slice(rows.length).reduce((sum, [, value]) => sum + value, 0);
  const entries = rows.map(([category, amountPaise]) => ({ category, amountPaise, others: false }));
  if (rest > 0) entries.push({ category: OTHERS_LABEL, amountPaise: rest, others: true });

  const biggest = Math.max(...entries.map(entry => entry.amountPaise));
  return entries.map(entry => ({
    ...entry,
    percent: Math.round((entry.amountPaise / total) * 100),
    ratio: entry.amountPaise / biggest,
  }));
}
