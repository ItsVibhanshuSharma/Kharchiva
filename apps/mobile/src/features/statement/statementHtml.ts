import type { LedgerTransaction } from '../../database/models/transaction';
import { formatRupees } from '../../utils/money';
import { monthLabel, summarize } from '../../screens/home/monthSummary';
import { formatShortDate } from '../../utils/dates';
import { dayCount, monthsInRange, rangeTitle, type DateRange } from './statementRange';

type StatementTransaction = Pick<
  LedgerTransaction,
  'id' | 'type' | 'title' | 'category' | 'amountPaise' | 'occurredAt' | 'dateLabel' | 'dateGroup' | 'paymentSource'
>;

export type CategoryTotal = { category: string; amountPaise: number; percent: number };

const COLORS = { text: '#1B1830', primary: '#4F12B3', income: '#087653', expense: '#B64B52', muted: '#6B6780', line: '#E7E3F2', soft: '#F6F3FD' };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Totals per category, largest first. Percent is of the total for that type. */
export function categoryTotals(
  transactions: Pick<StatementTransaction, 'type' | 'category' | 'amountPaise'>[],
  type: 'income' | 'expense',
): CategoryTotal[] {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const item of transactions) {
    if (item.type !== type) continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amountPaise);
    sum += item.amountPaise;
  }
  return [...totals.entries()]
    .map(([category, amountPaise]) => ({ category, amountPaise, percent: sum > 0 ? (amountPaise / sum) * 100 : 0 }))
    .sort((a, b) => b.amountPaise - a.amountPaise || a.category.localeCompare(b.category));
}

function summaryCards(incomePaise: number, expensePaise: number, remainingPaise: number): string {
  const remainingText = `${remainingPaise < 0 ? '−' : ''}${formatRupees(remainingPaise)}`;
  const card = (label: string, value: string, color: string) =>
    `<td class="card"><div class="card-label">${label}</div><div class="card-value" style="color:${color}">${value}</div></td>`;
  return `<table class="cards"><tr>
    ${card('Total Income', formatRupees(incomePaise), COLORS.income)}
    ${card('Total Expense', formatRupees(expensePaise), COLORS.expense)}
    ${card('Net Balance', remainingText, remainingPaise < 0 ? COLORS.expense : COLORS.primary)}
  </tr></table>`;
}

function categorySection(title: string, rows: CategoryTotal[], color: string): string {
  if (rows.length === 0) return '';
  const body = rows
    .map(
      row => `<tr>
        <td class="cat-name">${escapeHtml(row.category)}</td>
        <td class="cat-bar"><div class="bar-track"><div class="bar-fill" style="width:${Math.max(row.percent, 2).toFixed(1)}%;background:${color}"></div></div></td>
        <td class="num">${formatRupees(row.amountPaise)}</td>
        <td class="num muted">${row.percent.toFixed(1)}%</td>
      </tr>`,
    )
    .join('');
  return `<h2>${title}</h2><table class="plain">${body}</table>`;
}

function monthlyTable(transactions: StatementTransaction[], range: DateRange): string {
  const body = monthsInRange(range)
    .map(month => {
      const prefix = `${month.year}-${String(month.month).padStart(2, '0')}`;
      const row = summarize(transactions.filter(item => item.dateGroup.startsWith(prefix)));
      return `<tr>
        <td>${monthLabel(month)}</td>
        <td class="num" style="color:${COLORS.income}">${formatRupees(row.incomePaise)}</td>
        <td class="num" style="color:${COLORS.expense}">${formatRupees(row.expensePaise)}</td>
        <td class="num strong" style="color:${row.remainingPaise < 0 ? COLORS.expense : COLORS.text}">${row.remainingPaise < 0 ? '−' : ''}${formatRupees(row.remainingPaise)}</td>
      </tr>`;
    })
    .join('');
  return `<h2>Month by month</h2>
    <table class="grid"><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Expense</th><th class="num">Balance</th></tr></thead>
    <tbody>${body}</tbody></table>`;
}

function transactionTable(transactions: StatementTransaction[]): string {
  if (transactions.length === 0) return '<p class="muted">No entries in this period.</p>';
  const sorted = [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const body = sorted
    .map(item => {
      const isIncome = item.type === 'income';
      return `<tr>
        <td class="nowrap">${escapeHtml(item.dateLabel)}</td>
        <td>${escapeHtml(item.title)}${item.paymentSource ? `<div class="muted small">${escapeHtml(item.paymentSource)}</div>` : ''}</td>
        <td>${escapeHtml(item.category)}</td>
        <td class="num nowrap strong" style="color:${isIncome ? COLORS.income : COLORS.expense}">${isIncome ? '+' : '−'}${formatRupees(item.amountPaise)}</td>
      </tr>`;
    })
    .join('');
  return `<h2>All transactions</h2>
    <table class="grid"><thead><tr><th>Date</th><th>Details</th><th>Category</th><th class="num">Amount</th></tr></thead>
    <tbody>${body}</tbody></table>`;
}

/**
 * Self-contained HTML for the PDF. Everything user-entered is escaped.
 * Every statement lists all entries like a bank statement; ranges that span
 * more than one month also get a month-by-month summary first.
 */
export function buildStatementHtml(
  range: DateRange,
  transactions: StatementTransaction[],
  generatedOn: string,
  userName?: string,
): string {
  const summary = summarize(transactions);
  const title = rangeTitle(range);
  const days = dayCount(range);
  const kindLabel = `Statement · ${formatShortDate(range.from)} to ${formatShortDate(range.to)} · ${days} ${days === 1 ? 'day' : 'days'}`;
  const detail = `${monthsInRange(range).length > 1 ? monthlyTable(transactions, range) : ''}${transactionTable(transactions)}`;
  const savedRate =
    summary.incomePaise > 0 ? `${Math.round((summary.remainingPaise / summary.incomePaise) * 100)}% of income left` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1B1830; font-size: 12px; margin: 0; }
  .banner { background: ${COLORS.primary}; color: #fff; padding: 22px 24px; border-radius: 14px; }
  .brand { font-size: 12px; letter-spacing: 2px; opacity: .8; }
  .banner h1 { margin: 6px 0 2px; font-size: 26px; }
  .banner .sub { opacity: .85; font-size: 12px; }
  .cards { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 14px -8px 4px; }
  .card { background: ${COLORS.soft}; border-radius: 12px; padding: 12px 14px; width: 33%; }
  .card-label { color: ${COLORS.muted}; font-size: 11px; }
  .card-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: ${COLORS.primary}; }
  table { width: 100%; border-collapse: collapse; }
  table.grid th { text-align: left; background: ${COLORS.soft}; color: ${COLORS.muted}; font-size: 11px; padding: 8px; }
  table.grid td { padding: 8px; border-bottom: 1px solid ${COLORS.line}; vertical-align: top; }
  table.grid tr { page-break-inside: avoid; }
  table.plain td { padding: 6px 4px; }
  .cat-name { width: 28%; }
  .cat-bar { width: 40%; }
  .bar-track { background: ${COLORS.soft}; border-radius: 6px; height: 8px; }
  .bar-fill { height: 8px; border-radius: 6px; }
  .num { text-align: right; }
  .nowrap { white-space: nowrap; }
  .strong { font-weight: 700; }
  .muted { color: ${COLORS.muted}; }
  .small { font-size: 10px; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid ${COLORS.line}; color: ${COLORS.muted}; font-size: 10px; }
</style></head><body>
  <div class="banner">
    <div class="brand">KHARCHIVA</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${kindLabel}${userName ? ` · ${escapeHtml(userName)}` : ''}${savedRate ? ` · ${savedRate}` : ''}</div>
  </div>
  ${summaryCards(summary.incomePaise, summary.expensePaise, summary.remainingPaise)}
  ${categorySection('Where the money went', categoryTotals(transactions, 'expense'), COLORS.expense)}
  ${categorySection('Where the money came from', categoryTotals(transactions, 'income'), COLORS.income)}
  ${detail}
  <div class="footer">Generated by Kharchiva on ${escapeHtml(generatedOn)}. Amounts are in Indian Rupees (₹).</div>
</body></html>`;
}
