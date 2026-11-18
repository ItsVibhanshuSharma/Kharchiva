import {
  currentMonthKey,
  formatSignedRupees,
  isSameMonth,
  monthlyBreakdown,
  monthLabel,
  monthRange,
  shiftMonth,
  summarize,
  yearRange,
} from './monthSummary';

describe('monthSummary', () => {
  it('computes income, spent and remaining for the salary example', () => {
    const summary = summarize([
      { type: 'income', amountPaise: 200000_00 },
      { type: 'expense', amountPaise: 50000_00 },
      { type: 'expense', amountPaise: 12000_00 },
      { type: 'expense', amountPaise: 3000_00 },
    ]);
    expect(summary).toEqual({
      incomePaise: 200000_00,
      expensePaise: 65000_00,
      remainingPaise: 135000_00,
    });
    expect(formatSignedRupees(summary.remainingPaise)).toBe('+₹1,35,000');
  });

  it('goes negative when spending exceeds income', () => {
    const summary = summarize([
      { type: 'income', amountPaise: 10000_00 },
      { type: 'expense', amountPaise: 15000_50 },
    ]);
    expect(summary.remainingPaise).toBe(-5000_50);
    expect(formatSignedRupees(summary.remainingPaise)).toBe('−₹5,000.50');
  });

  it('formats zero without a sign and empty months as zero', () => {
    expect(formatSignedRupees(0)).toBe('₹0');
    expect(summarize([])).toEqual({ incomePaise: 0, expensePaise: 0, remainingPaise: 0 });
  });

  it('uses India time for the month boundary', () => {
    // 2026-09-30 19:00 UTC is already 1 Oct, 00:30 in India.
    expect(currentMonthKey(new Date('2026-09-30T19:00:00.000Z'))).toEqual({ year: 2026, month: 10 });
    expect(monthRange({ year: 2026, month: 10 })).toEqual({
      from: '2026-09-30T18:30:00.000Z',
      to: '2026-10-31T18:29:59.999Z',
    });
  });

  it('shifts across year boundaries and labels months', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(isSameMonth({ year: 2026, month: 3 }, { year: 2026, month: 3 })).toBe(true);
    expect(monthLabel({ year: 2026, month: 10 })).toBe('October 2026');
  });
  it('covers the full India-time year and breaks totals down by month', () => {
    expect(yearRange(2026)).toEqual({ from: '2025-12-31T18:30:00.000Z', to: '2026-12-31T18:29:59.999Z' });
    const rows = monthlyBreakdown([
      { type: 'income', amountPaise: 1000_00, dateGroup: '2026-01-01' },
      { type: 'expense', amountPaise: 300_00, dateGroup: '2026-01-15' },
      { type: 'expense', amountPaise: 500_00, dateGroup: '2026-03-31' },
    ], 2026, { year: 2026, month: 3 });
    expect(rows.map(row => [row.label, row.remainingPaise])).toEqual([['Jan', 700_00], ['Feb', 0], ['Mar', -500_00]]);
    expect(monthlyBreakdown([], 2025, { year: 2026, month: 3 })).toHaveLength(12);
  });
});
