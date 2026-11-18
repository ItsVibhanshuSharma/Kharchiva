import { initializeDatabase } from './initialize';
import { ListValidationError } from './repositories/CatalogRepository';
import { SQLiteRecurringRepository, type NewRecurringItem } from './repositories/RecurringRepository';
import { SQLiteTransactionRepository } from './repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from './testing/InMemoryFinancialDatabase';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const RENT: NewRecurringItem = {
  kind: 'expense',
  name: '  Rent ',
  amountPaise: 15_000_00,
  category: 'Housing',
  paymentSource: null,
  frequency: 'MONTHLY',
  startDate: '2026-12-01',
  autoAdd: true,
};

describe('SQLiteRecurringRepository', () => {
  let database: InMemoryFinancialDatabase;
  let repository: SQLiteRecurringRepository;
  let ids = 0;
  let clock = 0;

  beforeEach(async () => {
    ids = 0;
    clock = 0;
    database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteRecurringRepository(database, {
      idFactory: () => `rec-${++ids}`,
      now: () => new Date(Date.UTC(2026, 10, 18, 0, 0, clock++)),
    });
  });

  it('runs the migration that creates the recurring table', () => {
    const sql = database.statements.map(statement => statement.query).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS recurring_items');
  });

  it('adds, lists, updates and soft-deletes items', async () => {
    const rent = await repository.add(RENT);
    expect(rent).toMatchObject({ id: 'rec-1', name: 'Rent', nextDate: '2026-12-01', autoAdd: true });
    await repository.add({ ...RENT, name: 'Netflix', amountPaise: 649_00, category: 'Entertainment', autoAdd: false });

    let items = await repository.list();
    expect(items.map(item => [item.name, item.autoAdd])).toEqual([['Rent', true], ['Netflix', false]]);

    await repository.update('rec-1', { amountPaise: 16_000_00, autoAdd: false });
    await repository.setNextDate('rec-1', '2027-01-01');
    items = await repository.list();
    expect(items[0]).toMatchObject({ amountPaise: 16_000_00, autoAdd: false, nextDate: '2027-01-01', startDate: '2026-12-01' });

    await repository.remove('rec-2');
    expect((await repository.list()).map(item => item.name)).toEqual(['Rent']);
  });

  it('rejects bad input with a friendly message', async () => {
    await expect(repository.add({ ...RENT, name: '  ' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.add({ ...RENT, amountPaise: 0 })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.add({ ...RENT, amountPaise: 10.5 })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.add({ ...RENT, category: ' ' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.add({ ...RENT, startDate: '1 Dec' })).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.setNextDate('rec-1', 'kal')).rejects.toBeInstanceOf(ListValidationError);
    expect(await repository.list()).toEqual([]);
  });
});

describe('SQLiteTransactionRepository clientId', () => {
  it('creates one row per clientId, even when called again', async () => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    const transactions = new SQLiteTransactionRepository(database);
    const input = { amountPaise: 500_00, category: 'Housing', clientId: 'rec:a:2026-12-01', occurredAt: '2026-12-01T03:30:00.000Z' };

    const first = await transactions.createExpense(input);
    const second = await transactions.createExpense({ ...input, amountPaise: 999_00 });
    expect(first.id).toBe('rec:a:2026-12-01');
    expect(second).toMatchObject({ id: first.id, amountPaise: 500_00 });

    await transactions.createIncome({ amountPaise: 50_000_00, category: 'Salary', clientId: 'rec:b:2026-12-01' });
    await transactions.createIncome({ amountPaise: 50_000_00, category: 'Salary', clientId: 'rec:b:2026-12-01' });
    expect(await transactions.listTransactions()).toHaveLength(2);
  });
});
