import {initializeDatabase} from './initialize';
import {SQLiteTransactionRepository, TransactionValidationError} from './repositories/TransactionRepository';
import {InMemoryFinancialDatabase} from './testing/InMemoryFinancialDatabase';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));

describe('transaction SQLite migrations and repository', () => {
  it('creates expense and income tables with indexes and keeps completed migrations repeatable', async () => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    const repository = new SQLiteTransactionRepository(database, {idFactory: () => 'txn-1', now: () => new Date('2026-10-13T08:00:00.000Z')});
    await repository.createExpense({amountPaise: 12345, category: 'Food'});
    await initializeDatabase(database);
    expect(database.statements.some(({query}) => query.includes('CREATE TABLE IF NOT EXISTS expenses'))).toBe(true);
    expect(database.statements.some(({query}) => query.includes('CREATE TABLE IF NOT EXISTS incomes'))).toBe(true);
    expect(database.statements.some(({query}) => query.includes('idx_expenses_expenseDate'))).toBe(true);
    expect(await repository.getById('txn-1', 'expense')).toMatchObject({amountPaise: 12345, occurredAt: '2026-10-13T08:00:00.000Z'});
    expect(database.statements.filter(({query}) => query.includes('CREATE TABLE IF NOT EXISTS expenses'))).toHaveLength(1);
  });

  it('creates, lists, gets, updates and soft-deletes expenses and incomes in integer paise', async () => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    let id = 0;
    const repository = new SQLiteTransactionRepository(database, {
      idFactory: () => `txn-${++id}`,
      now: () => new Date('2026-10-13T08:00:00.000Z'),
    });
    const expense = await repository.createExpense({amountPaise: 240050, category: 'Food & Dining', merchant: 'Cafe', paymentSource: 'UPI', occurredAt: '2026-09-12T18:30:00+05:30'});
    const income = await repository.createIncome({amountPaise: 2200000, category: 'Salary', sourceName: 'Employer'});
    expect(expense.amountPaise).toBe(240050);
    expect((await repository.getById(income.id))?.type).toBe('income');
    expect(await repository.listTransactions()).toHaveLength(2);
    const updated = await repository.updateExpense(expense.id, {merchant: 'Dinner', amountPaise: 240000});
    expect(updated).toMatchObject({merchant: 'Dinner', amountPaise: 240000});
    await repository.deleteTransaction(expense.id, 'expense');
    expect(await repository.getById(expense.id)).toBeNull();
    expect((await repository.listTransactions()).map(item => item.id)).toEqual([income.id]);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid integer paise amount %s', async amountPaise => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    const repository = new SQLiteTransactionRepository(database);
    await expect(repository.createExpense({amountPaise, category: 'Food'})).rejects.toBeInstanceOf(TransactionValidationError);
  });

  it('validates nonempty category and valid timestamp before writing', async () => {
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    const repository = new SQLiteTransactionRepository(database);
    await expect(repository.createExpense({amountPaise: 100, category: '  '})).rejects.toBeInstanceOf(TransactionValidationError);
    await expect(repository.createExpense({amountPaise: 100, category: 'Food', occurredAt: 'not-a-date'})).rejects.toBeInstanceOf(TransactionValidationError);
    expect(database.statements.some(({query}) => query.startsWith('INSERT INTO expenses'))).toBe(false);
  });
});
