import { buildStatementHtml, categoryTotals } from './statementHtml';

const base = { id: '1', dateGroup: '2026-09-10', dateLabel: '10 Sep 2026', paymentSource: null };
const items = [
  { ...base, id: 'a', type: 'income' as const, title: 'Salary', category: 'Salary', amountPaise: 200000_00, occurredAt: '2026-09-01T05:00:00.000Z', dateGroup: '2026-09-01' },
  { ...base, id: 'b', type: 'expense' as const, title: 'Rent <b>', category: 'Rent', amountPaise: 50000_00, occurredAt: '2026-09-02T05:00:00.000Z', dateGroup: '2026-09-02' },
  { ...base, id: 'c', type: 'expense' as const, title: 'Food', category: 'Food', amountPaise: 10000_00, occurredAt: '2026-10-03T05:00:00.000Z', dateGroup: '2026-10-03', dateLabel: '3 Oct 2026' },
];

describe('statementHtml', () => {
  it('groups category totals largest first with percentages', () => {
    const totals = categoryTotals(items, 'expense');
    expect(totals.map(row => row.category)).toEqual(['Rent', 'Food']);
    expect(Math.round(totals[0].percent)).toBe(83);
  });

  it('shows totals, every entry and escapes user text', () => {
    const html = buildStatementHtml({ from: '2026-09-01', to: '2026-09-30' }, items.slice(0, 2), '1 Oct 2026');
    expect(html).toContain('September 2026');
    expect(html).toContain('1 Sep 2026 to 30 Sep 2026 · 30 days');
    expect(html).toContain('₹2,00,000');
    expect(html).toContain('₹1,50,000');
    expect(html).toContain('All transactions');
    expect(html).not.toContain('Month by month');
    expect(html).toContain('Rent &lt;b&gt;');
    expect(html).not.toContain('Rent <b>');
  });

  it('adds a month-by-month table when the range spans months, and still lists entries', () => {
    const html = buildStatementHtml({ from: '2026-09-01', to: '2026-10-31' }, items, '1 Nov 2026');
    expect(html).toContain('Month by month');
    expect(html).toContain('September 2026');
    expect(html).toContain('October 2026');
    expect(html).toContain('All transactions');
    expect(html).toContain('3 Oct 2026');
  });

  it('handles an empty range', () => {
    const html = buildStatementHtml({ from: '2026-11-08', to: '2026-11-18' }, [], '18 Nov 2026');
    expect(html).toContain('8 Nov – 18 Nov 2026');
    expect(html).toContain('No entries in this period.');
  });
});
