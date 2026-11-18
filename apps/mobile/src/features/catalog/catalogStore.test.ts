import { initializeDatabase } from '../../database/initialize';
import { SQLiteCatalogRepository } from '../../database/repositories/CatalogRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import {
  addCustomCategory,
  addPaymentSource,
  categoryNames,
  getCatalog,
  loadCatalog,
  nameProblem,
  paymentSourceNames,
  removeCustomCategory,
  resetCatalogForTests,
  setBudget,
  setDefaultHidden,
} from './catalogStore';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
const mockGetter = jest.fn<Promise<SQLiteCatalogRepository>, []>();
jest.mock('../../database/catalogRepository', () => ({ getCatalogRepository: () => mockGetter() }));

describe('catalogStore', () => {
  beforeEach(async () => {
    resetCatalogForTests();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    let ids = 0;
    mockGetter.mockReset().mockResolvedValue(new SQLiteCatalogRepository(database, { idFactory: () => `id-${++ids}` }));
    await loadCatalog(true);
  });

  it('puts the user\'s categories after the built-in ones but before "Other"', async () => {
    await addCustomCategory({ name: 'Gym', type: 'expense', emoji: '🏋️' });
    const names = categoryNames(getCatalog(), 'expense');
    expect(names.slice(-2)).toEqual(['Gym', 'Other']);
    expect(names[0]).toBe('Food & Dining');
    expect(categoryNames(getCatalog(), 'income')).not.toContain('Gym');
  });

  it('refuses duplicates of built-in or existing names, ignoring case', async () => {
    await expect(addCustomCategory({ name: 'fuel', type: 'expense' })).rejects.toThrow('"fuel" pehle se hai.');
    await addPaymentSource('HDFC Credit Card');
    await expect(addPaymentSource('hdfc credit card')).rejects.toThrow('pehle se hai');
    await expect(addPaymentSource('upi')).rejects.toThrow('pehle se hai');
    expect(paymentSourceNames(getCatalog())).toEqual(['UPI', 'Cash', 'Credit Card', 'Debit Card', 'HDFC Credit Card']);
    expect(nameProblem('   ', [])).toBe('Naam likho.');
  });

  it('hides and shows built-in categories, saved across loads, but never "Other"', async () => {
    await setDefaultHidden('expense', 'Fuel', true);
    await setDefaultHidden('expense', 'Other', true);
    expect(categoryNames(getCatalog(), 'expense')).not.toContain('Fuel');
    expect(categoryNames(getCatalog(), 'expense')).toContain('Other');
    // Same name on the other side is untouched.
    expect(categoryNames(getCatalog(), 'income')).toContain('Salary');

    resetCatalogForTests();
    await loadCatalog(true);
    expect(getCatalog().hiddenDefaults).toEqual(['expense:Fuel']);
    // A hidden built-in name still cannot be reused for a custom category.
    await expect(addCustomCategory({ name: 'fuel', type: 'expense' })).rejects.toThrow('pehle se hai');

    await setDefaultHidden('expense', 'Fuel', false);
    expect(categoryNames(getCatalog(), 'expense')).toContain('Fuel');
  });
  it('drops a budget along with its category', async () => {
    const gym = await addCustomCategory({ name: 'Gym', type: 'expense' });
    await setBudget('Gym', 1500_00);
    await setBudget('Fuel', 2000_00);
    expect(getCatalog().budgets).toHaveLength(2);
    await removeCustomCategory(gym.id);
    expect(getCatalog().budgets.map(item => item.category)).toEqual(['Fuel']);
    expect(getCatalog().customCategories).toEqual([]);
  });

  it('keeps built-in lists working when storage fails', async () => {
    resetCatalogForTests();
    mockGetter.mockReset().mockRejectedValue(new Error('no db'));
    await loadCatalog(true);
    expect(getCatalog().loaded).toBe(false);
    expect(categoryNames(getCatalog(), 'expense')).toContain('Food & Dining');
  });
});
