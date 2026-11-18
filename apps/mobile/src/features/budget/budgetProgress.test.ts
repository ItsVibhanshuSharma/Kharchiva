import { TOTAL_BUDGET, type Budget } from '../../database/repositories/CatalogRepository';
import { budgetNotice, budgetProgress, remainingText } from './budgetProgress';

const budget = (id: string, category: string, limitRupees: number): Budget => ({ id, category, limitPaise: limitRupees * 100, createdAt: id });
const spend = (category: string, rupees: number) => ({ category, amountPaise: rupees * 100 });

describe('budgetProgress', () => {
  const budgets = [budget('a', 'Food & Dining', 8000), budget('b', 'Fuel', 2000), budget('c', TOTAL_BUDGET, 50000)];
  const expenses = [spend('Food & Dining', 6500), spend('food & dining', 0), spend('Fuel', 2500), spend('Rent', 15000)];

  it('derives spent from expenses, with the total first and the fullest next', () => {
    const rows = budgetProgress(budgets, expenses);
    expect(rows.map(row => [row.label, row.spentPaise / 100, row.level])).toEqual([
      ['Sab kharche', 24000, 'ok'],
      ['Fuel', 2500, 'over'],
      ['Food & Dining', 6500, 'near'],
    ]);
    expect(rows[1].remainingPaise).toBe(-500_00);
  });

  it('words what is left without judging', () => {
    expect(remainingText({ remainingPaise: 1500_00 })).toBe('₹1,500 bacha');
    expect(remainingText({ remainingPaise: -500_00 })).toBe('₹500 zyada');
  });
});

describe('budgetNotice', () => {
  const food = budget('a', 'Food & Dining', 8000);

  it('tells once when an expense crosses 80%', () => {
    // 5,500 / 8,000 = 68%: below the 80% line, nothing to say.
    expect(budgetNotice(spend('Food & Dining', 500), [food], [spend('Food & Dining', 5000), spend('Food & Dining', 500)])).toBeNull();
    expect(budgetNotice(spend('Food & Dining', 500), [food], [spend('Food & Dining', 6200), spend('Food & Dining', 500)])).toEqual({
      tone: 'info',
      message: 'Food & Dining budget ka 83% use ho gaya (₹6,700 / ₹8,000)',
    });
    // Already past 80% before this expense: stay quiet.
    expect(budgetNotice(spend('Food & Dining', 100), [food], [spend('Food & Dining', 7000), spend('Food & Dining', 100)])).toBeNull();
  });

  it('tells when the limit is passed, and prefers that over the 80% note', () => {
    const total = budget('t', TOTAL_BUDGET, 10000);
    const month = [spend('Food & Dining', 7900), spend('Rent', 1000), spend('Food & Dining', 600)];
    expect(budgetNotice(spend('Food & Dining', 600), [total, food], month)).toEqual({
      tone: 'error',
      message: 'Food & Dining budget se ₹500 zyada ho gaya',
    });
  });

  it('ignores other categories and users without budgets', () => {
    expect(budgetNotice(spend('Fuel', 5000), [food], [spend('Fuel', 5000)])).toBeNull();
    expect(budgetNotice(spend('Fuel', 5000), [], [spend('Fuel', 5000)])).toBeNull();
  });
});
