import { initializeDatabase } from './initialize';
import { ListValidationError, SQLiteCatalogRepository, TOTAL_BUDGET } from './repositories/CatalogRepository';
import { InMemoryFinancialDatabase } from './testing/InMemoryFinancialDatabase';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

describe('SQLiteCatalogRepository', () => {
  let repository: SQLiteCatalogRepository;
  let ids = 0;
  let clock = 0;

  beforeEach(async () => {
    ids = 0;
    clock = 0;
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteCatalogRepository(database, {
      idFactory: () => `id-${++ids}`,
      now: () => new Date(Date.UTC(2026, 10, 18, 0, 0, clock++)),
    });
  });

  it('runs the migration that creates the list tables', async () => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    const sql = database.statements.map(statement => statement.query).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS custom_categories');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS payment_sources');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS budgets');
  });

  it('adds, lists in order and soft-deletes custom categories', async () => {
    await repository.addCategory({ name: '  Gym  ', type: 'expense', emoji: '🏋️' });
    await repository.addCategory({ name: 'Rent income', type: 'income' });
    expect(await repository.listCategories()).toEqual([
      expect.objectContaining({ id: 'id-1', name: 'Gym', type: 'expense', emoji: '🏋️' }),
      expect.objectContaining({ id: 'id-2', name: 'Rent income', type: 'income', emoji: null }),
    ]);
    await repository.removeCategory('id-1');
    expect((await repository.listCategories()).map(item => item.name)).toEqual(['Rent income']);
  });

  it('rejects empty, too long and non-emoji input', async () => {
    await expect(repository.addCategory({ name: '   ', type: 'expense' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.addCategory({ name: 'x'.repeat(31), type: 'expense' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.addCategory({ name: 'Gym', type: 'expense', emoji: 'not an emoji at all' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.addPaymentSource('')).rejects.toBeInstanceOf(ListValidationError);
  });

  it('adds and removes payment sources', async () => {
    await repository.addPaymentSource('HDFC Credit Card');
    expect((await repository.listPaymentSources()).map(item => item.name)).toEqual(['HDFC Credit Card']);
    await repository.removePaymentSource('id-1');
    expect(await repository.listPaymentSources()).toEqual([]);
  });

  it('keeps one budget per category: setting again updates the limit', async () => {
    await repository.setBudget('Food & Dining', 8000_00);
    await repository.setBudget(TOTAL_BUDGET, 50000_00);
    await repository.setBudget('food & dining', 9000_00);
    expect((await repository.listBudgets()).map(item => [item.category, item.limitPaise])).toEqual([
      ['Food & Dining', 9000_00],
      [TOTAL_BUDGET, 50000_00],
    ]);
    await expect(repository.setBudget('Fuel', 0)).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.setBudget('Fuel', 10.5)).rejects.toBeInstanceOf(ListValidationError);
    await repository.removeBudget('id-1');
    expect((await repository.listBudgets()).map(item => item.category)).toEqual([TOTAL_BUDGET]);
  });
});
