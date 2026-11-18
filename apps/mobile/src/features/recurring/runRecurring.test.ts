import { initializeDatabase } from '../../database/initialize';
import { SQLiteRecurringRepository, type NewRecurringItem } from '../../database/repositories/RecurringRepository';
import { SQLiteTransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { autoAddedMessage } from '../../app/useForegroundTasks';
import { addDueOccurrence, dueManualItems, processRecurring, skipDueOccurrence } from './runRecurring';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
const mockTransactions = jest.fn();
const mockRecurring = jest.fn();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockTransactions() }));
jest.mock('../../database/recurringRepository', () => ({ getRecurringRepository: () => mockRecurring() }));
jest.mock('../reminder/reminder', () => ({ syncNothingDaysFromNotification: jest.fn() }));

const RENT: NewRecurringItem = {
  kind: 'expense',
  name: 'Rent',
  amountPaise: 15_000_00,
  category: 'Housing',
  paymentSource: 'UPI',
  frequency: 'MONTHLY',
  startDate: '2026-09-01',
  autoAdd: true,
};

describe('recurring runner', () => {
  let transactions: SQLiteTransactionRepository;
  let recurring: SQLiteRecurringRepository;
  let ids = 0;

  beforeEach(async () => {
    ids = 0;
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    transactions = new SQLiteTransactionRepository(database);
    recurring = new SQLiteRecurringRepository(database, { idFactory: () => `r${++ids}` });
    mockTransactions.mockResolvedValue(transactions);
    mockRecurring.mockResolvedValue(recurring);
  });

  it('adds every missed occurrence once and moves the next date on', async () => {
    await recurring.add(RENT);
    await recurring.add({ ...RENT, name: 'Netflix', amountPaise: 649_00, autoAdd: false });

    const added = await processRecurring('2026-11-18');
    expect(added.map(item => item.date)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect((await recurring.list())[0].nextDate).toBe('2026-12-01');
    // The manual item is left for the Home card.
    expect((await recurring.list())[1].nextDate).toBe('2026-09-01');

    const rows = await transactions.listTransactions();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ type: 'expense', amountPaise: 15_000_00, merchant: 'Rent', paymentSource: 'UPI', source: 'RECURRING' });
    expect(rows.map(row => row.occurredAt).sort()[0]).toBe('2026-09-01T03:30:00.000Z');

    // Running again (or a restored old nextDate) never doubles entries.
    expect(await processRecurring('2026-11-18')).toEqual([]);
    await recurring.setNextDate('r1', '2026-09-01');
    await processRecurring('2026-11-18');
    expect(await transactions.listTransactions()).toHaveLength(3);
  });

  it('adds income under the item name', async () => {
    await recurring.add({ ...RENT, kind: 'income', name: 'Salary', category: 'Salary', startDate: '2026-11-18' });
    await processRecurring('2026-11-18');
    expect((await transactions.listTransactions())[0]).toMatchObject({ type: 'income', sourceName: 'Salary' });
  });

  it('lets the user add or skip a due manual item', async () => {
    await recurring.add({ ...RENT, name: 'EMI', autoAdd: false, startDate: '2026-11-05' });
    await recurring.add({ ...RENT, name: 'Gym', autoAdd: false, startDate: '2026-12-05' });
    let due = dueManualItems(await recurring.list(), '2026-11-18');
    expect(due.map(item => item.name)).toEqual(['EMI']);

    await addDueOccurrence(due[0]);
    expect(await transactions.listTransactions()).toHaveLength(1);
    due = dueManualItems(await recurring.list(), '2026-12-05');
    expect(due.map(item => [item.name, item.nextDate])).toEqual([['EMI', '2026-12-05'], ['Gym', '2026-12-05']]);

    await skipDueOccurrence(due[0]);
    expect((await recurring.list())[0].nextDate).toBe('2027-01-05');
    expect(await transactions.listTransactions()).toHaveLength(1);
  });

  it('describes auto-added entries in one short line', () => {
    expect(autoAddedMessage([])).toBeNull();
    expect(autoAddedMessage([{ name: 'Rent', amountPaise: 15_000_00, kind: 'expense', date: '2026-12-01' }])).toBe(
      'Rent −₹15,000 apne aap jud gaya',
    );
    expect(
      autoAddedMessage([
        { name: 'Rent', amountPaise: 1, kind: 'expense', date: '2026-12-01' },
        { name: 'Salary', amountPaise: 1, kind: 'income', date: '2026-12-01' },
      ]),
    ).toBe('2 recurring entries apne aap jud gayi');
  });
});
