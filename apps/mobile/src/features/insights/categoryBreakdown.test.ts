import { categoryBreakdown, OTHERS_LABEL } from './categoryBreakdown';

const expense = (category: string, amountPaise: number) => ({ type: 'expense' as const, category, amountPaise });

describe('categoryBreakdown', () => {
  it('is empty when nothing was spent', () => {
    expect(categoryBreakdown([])).toEqual([]);
    expect(categoryBreakdown([{ type: 'income', category: 'Salary', amountPaise: 50_000_00 }])).toEqual([]);
  });

  it('groups expenses by category, biggest first, ignoring income', () => {
    const rows = categoryBreakdown([
      expense('Food', 300_00),
      expense('Rent', 600_00),
      expense('Food', 100_00),
      { type: 'income', category: 'Salary', amountPaise: 99_999_00 },
    ]);
    expect(rows).toEqual([
      { category: 'Rent', amountPaise: 600_00, percent: 60, ratio: 1, others: false },
      { category: 'Food', amountPaise: 400_00, percent: 40, ratio: 400 / 600, others: false },
    ]);
  });

  it('folds the smallest categories into one "Baaki sab" row', () => {
    const rows = categoryBreakdown(
      [expense('A', 500), expense('B', 400), expense('C', 300), expense('D', 200), expense('E', 100)],
      3,
    );
    expect(rows.map(row => [row.category, row.amountPaise, row.others])).toEqual([
      ['A', 500, false],
      ['B', 400, false],
      [OTHERS_LABEL, 600, true],
    ]);
    // Exactly `limit` categories show as they are.
    expect(categoryBreakdown([expense('A', 1), expense('B', 1), expense('C', 1)], 3).some(row => row.others)).toBe(false);
  });
});
