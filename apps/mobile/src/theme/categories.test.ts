import { EXPENSE_CATEGORIES, categoryLook } from './categories';

describe('categoryLook', () => {
  it('maps common expense names, including legacy/custom variants', () => {
    expect(categoryLook('Food & Dining', 'expense').emoji).toBe('🍔');
    expect(categoryLook('Swiggy dinner', 'expense').emoji).toBe('🍔');
    expect(categoryLook('Groceries', 'expense').emoji).toBe('🛒');
    expect(categoryLook('Petrol', 'expense').emoji).toBe('⛽');
    expect(categoryLook('Rent', 'expense').emoji).toBe('🏠');
  });

  it('maps income names and falls back for unknown categories', () => {
    expect(categoryLook('Salary', 'income').emoji).toBe('💰');
    expect(categoryLook('Bonus', 'income').emoji).toBe('🎁');
    expect(categoryLook('Something else', 'income').emoji).toBe('💵');
    expect(categoryLook('Something else', 'expense').emoji).toBe('💸');
  });
});

describe('Sutta category', () => {
  it('is offered as an expense category, before "Other"', () => {
    const list: readonly string[] = EXPENSE_CATEGORIES;
    expect(list).toContain('Sutta');
    expect(list.indexOf('Sutta')).toBeLessThan(list.indexOf('Other'));
  });
  it('gets its own icon for cigarette and tobacco names', () => {
    const sutta = categoryLook('Sutta', 'expense');
    expect(sutta.emoji).toBe('🚬');
    expect(categoryLook('Cigarettes', 'expense')).toBe(sutta);
    expect(categoryLook('Groceries', 'expense')).not.toBe(sutta);
  });
});
