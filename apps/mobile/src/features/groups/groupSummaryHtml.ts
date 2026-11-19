import { escapeHtml } from '../statement/statementHtml';
import { formatRupees } from '../../utils/money';
import { categoryLabel, displayDate, memberName } from './groupFormat';
import type { GroupDetail, GroupExpense, Settlement } from './types';

const COLORS = { text: '#1B1830', primary: '#4F12B3', get: '#087653', owe: '#B64B52', muted: '#6B6780', line: '#E7E3F2', soft: '#F6F3FD' };

/** Printable trip summary: totals, who owes whom, every expense and every payment. */
export function buildGroupSummaryHtml(
  group: GroupDetail,
  expenses: GroupExpense[],
  settlements: Settlement[],
  generatedOn: string,
): string {
  const name = (id: string) => escapeHtml(memberName(group.members, id));
  const total = expenses.reduce((sum, expense) => sum + expense.amountPaise, 0);

  const paidBy = new Map<string, number>();
  const share = new Map<string, number>();
  for (const expense of expenses) {
    for (const payer of expense.payers) paidBy.set(payer.memberId, (paidBy.get(payer.memberId) ?? 0) + payer.amountPaise);
    for (const split of expense.splits) share.set(split.memberId, (share.get(split.memberId) ?? 0) + split.amountPaise);
  }

  const memberRows = group.members
    .filter(member => member.status !== 'REMOVED' || (paidBy.get(member.id) ?? 0) + (share.get(member.id) ?? 0) > 0)
    .map(member => {
      const balance = member.balancePaise;
      const color = balance > 0 ? COLORS.get : balance < 0 ? COLORS.owe : COLORS.muted;
      const text = balance > 0 ? `Gets ${formatRupees(balance)}` : balance < 0 ? `Owes ${formatRupees(-balance)}` : 'Settled';
      return `<tr><td>${escapeHtml(member.displayName)}</td><td class="num">${formatRupees(paidBy.get(member.id) ?? 0)}</td><td class="num">${formatRupees(share.get(member.id) ?? 0)}</td><td class="num" style="color:${color}">${text}</td></tr>`;
    })
    .join('');

  const transferRows = group.transfers.length
    ? group.transfers
        .map(t => `<tr><td>${name(t.fromMemberId)} pays ${name(t.toMemberId)}</td><td class="num">${formatRupees(t.amountPaise)}</td></tr>`)
        .join('')
    : `<tr><td colspan="2" class="muted">Everyone is settled up.</td></tr>`;

  const expenseRows = expenses.length
    ? expenses
        .map(
          expense => `<tr>
            <td>${escapeHtml(displayDate(expense.expenseDate))}</td>
            <td>${escapeHtml(expense.title)}<div class="muted">${escapeHtml(categoryLabel(expense.categoryKey))}</div></td>
            <td>${expense.payers.map(p => name(p.memberId)).join(', ')}</td>
            <td class="num">${formatRupees(expense.amountPaise)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="muted">No expenses yet.</td></tr>`;

  const settlementRows = settlements
    .map(
      s => `<tr><td>${escapeHtml(displayDate(s.settledAt))}</td><td>${name(s.fromMemberId)} paid ${name(s.toMemberId)}</td><td class="num">${formatRupees(s.amountPaise)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Helvetica, Arial, sans-serif; color: ${COLORS.text}; font-size: 12px; }
    h1 { color: ${COLORS.primary}; font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 22px 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: ${COLORS.muted}; font-size: 11px; border-bottom: 1px solid ${COLORS.line}; padding: 6px 4px; }
    td { padding: 7px 4px; border-bottom: 1px solid ${COLORS.line}; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: ${COLORS.muted}; font-size: 11px; }
    .total { background: ${COLORS.soft}; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
  </style></head><body>
    <h1>${escapeHtml(group.title)}</h1>
    <div class="muted">Kharchiva group summary · ${escapeHtml(generatedOn)}${group.status === 'CLOSED' ? ' · Closed' : ''}</div>
    <div class="total"><b>Total spent:</b> ${formatRupees(total)} &nbsp;·&nbsp; ${expenses.length} expenses &nbsp;·&nbsp; ${group.members.filter(m => m.status !== 'REMOVED').length} people</div>
    <h2>Balances</h2>
    <table><tr><th>Person</th><th class="num">Paid</th><th class="num">Their share</th><th class="num">Balance</th></tr>${memberRows}</table>
    <h2>How to settle up</h2>
    <table>${transferRows}</table>
    <h2>Expenses</h2>
    <table><tr><th>Date</th><th>Expense</th><th>Paid by</th><th class="num">Amount</th></tr>${expenseRows}</table>
    ${settlementRows ? `<h2>Payments made</h2><table>${settlementRows}</table>` : ''}
  </body></html>`;
}
