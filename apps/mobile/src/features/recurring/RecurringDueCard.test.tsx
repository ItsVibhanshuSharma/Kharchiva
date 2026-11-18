import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteRecurringRepository } from '../../database/repositories/RecurringRepository';
import { SQLiteTransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { RecurringDueCard } from './RecurringDueCard';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
const mockTransactions = jest.fn();
const mockRecurring = jest.fn();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockTransactions() }));
jest.mock('../../database/recurringRepository', () => ({ getRecurringRepository: () => mockRecurring() }));
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({ showSnackbar: (options: unknown) => mockSnackbar(options) }));

describe('RecurringDueCard', () => {
  let transactions: SQLiteTransactionRepository;
  let recurring: SQLiteRecurringRepository;

  beforeEach(async () => {
    // 18 Nov 2026, 10:00 IST.
    jest.useFakeTimers({ now: new Date('2026-11-18T04:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    transactions = new SQLiteTransactionRepository(database);
    let ids = 0;
    recurring = new SQLiteRecurringRepository(database, { idFactory: () => `r${++ids}` });
    mockTransactions.mockResolvedValue(transactions);
    mockRecurring.mockResolvedValue(recurring);
    mockSnackbar.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const flush = async () => {
    await ReactTestRenderer.act(async () => {
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });
  };
  const render = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<RecurringDueCard />);
    });
    await flush();
    return renderer!;
  };
  const base = { kind: 'expense' as const, category: 'Housing', paymentSource: null, frequency: 'MONTHLY' as const, autoAdd: false };

  it('stays hidden when nothing is due', async () => {
    await recurring.add({ ...base, name: 'Rent', amountPaise: 100_00, startDate: '2026-12-01' });
    await recurring.add({ ...base, name: 'Auto', amountPaise: 100_00, startDate: '2026-11-01', autoAdd: true });
    expect((await render()).toJSON()).toBeNull();
  });

  it('adds or skips a due item in one tap', async () => {
    await recurring.add({ ...base, name: 'EMI', amountPaise: 5_000_00, startDate: '2026-11-05' });
    await recurring.add({ ...base, name: 'Gym', amountPaise: 1_000_00, startDate: '2026-11-10' });
    const renderer = await render();
    const texts = () => renderer.root.findAllByType(Text).map(node => String(node.props.children));
    expect(texts()).toEqual(expect.arrayContaining(['Due hai', 'EMI · −₹5,000', 'Gym · −₹1,000']));

    await ReactTestRenderer.act(async () => renderer.root.findByProps({ accessibilityLabel: 'Add EMI' }).props.onPress());
    await flush();
    expect(mockSnackbar).toHaveBeenCalledWith({ message: 'EMI jud gaya' });
    expect(await transactions.listTransactions()).toHaveLength(1);

    await ReactTestRenderer.act(async () => renderer.root.findByProps({ accessibilityLabel: 'Skip Gym' }).props.onPress());
    await flush();
    expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Gym is baar skip' });
    expect(await transactions.listTransactions()).toHaveLength(1);
    expect(renderer.toJSON()).toBeNull();
  });
});
