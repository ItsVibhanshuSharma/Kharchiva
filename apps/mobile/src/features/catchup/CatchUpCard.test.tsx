import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteDayStatusRepository } from '../../database/repositories/DayStatusRepository';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { CatchUpCard } from './CatchUpCard';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
const mockTransactions = jest.fn<Promise<TransactionRepository>, []>();
const mockDays = jest.fn<Promise<SQLiteDayStatusRepository>, []>();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockTransactions() }));
jest.mock('../../database/dayStatusRepository', () => ({ getDayStatusRepository: () => mockDays() }));
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({ showSnackbar: (options: unknown) => mockSnackbar(options) }));

// Wednesday 18 Nov 2026, 10:00 IST (morning: today is not nagged yet).
const MORNING = new Date('2026-11-18T04:30:00.000Z');
const EVENING = new Date('2026-11-18T14:30:00.000Z');

describe('CatchUpCard', () => {
  let transactions: SQLiteTransactionRepository;
  let days: SQLiteDayStatusRepository;

  const setup = async (now: Date) => {
    jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    transactions = new SQLiteTransactionRepository(database);
    days = new SQLiteDayStatusRepository(database);
    mockTransactions.mockReset().mockResolvedValue(transactions);
    mockDays.mockReset().mockResolvedValue(days);
    mockSnackbar.mockClear();
  };
  afterEach(() => jest.useRealTimers());

  const flush = async () => {
    await ReactTestRenderer.act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
  };
  const render = async (onAdd = jest.fn()) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<CatchUpCard onAdd={onAdd} />);
    });
    await flush();
    return renderer!;
  };
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text).map(node => String(node.props.children));

  it('stays hidden for a brand new user', async () => {
    await setup(MORNING);
    expect((await render()).toJSON()).toBeNull();
  });

  it('lists missed days and lets the user add or mark "nothing" in one tap', async () => {
    await setup(MORNING);
    await transactions.createExpense({ amountPaise: 100_00, category: 'Fuel', occurredAt: '2026-11-15T05:00:00.000Z' });
    await transactions.createExpense({ amountPaise: 100_00, category: 'Fuel', occurredAt: '2026-11-18T03:00:00.000Z' });
    const onAdd = jest.fn();
    const renderer = await render(onAdd);
    expect(texts(renderer)).toEqual(expect.arrayContaining(['2 din ka hisaab baaki', 'Tue, 17 Nov', 'Mon, 16 Nov']));

    renderer.root.findByProps({ accessibilityLabel: 'Add for 2026-11-17' }).props.onPress();
    expect(onAdd).toHaveBeenCalledWith('2026-11-17');

    await ReactTestRenderer.act(async () => renderer.root.findByProps({ accessibilityLabel: 'Nothing spent on 2026-11-16' }).props.onPress());
    await flush();
    expect(await days.noExpenseDays('2026-11-16', '2026-11-16')).toEqual(new Set(['2026-11-16']));
    expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Mon, 16 Nov: koi kharcha nahi' });
    expect(texts(renderer)).toContain('1 din ka hisaab baaki');
    expect(texts(renderer)).not.toContain('Mon, 16 Nov');
  });

  it('asks about today only in the evening', async () => {
    await setup(EVENING);
    await transactions.createExpense({ amountPaise: 100_00, category: 'Fuel', occurredAt: '2026-11-17T05:00:00.000Z' });
    const renderer = await render();
    expect(texts(renderer)).toEqual(expect.arrayContaining(['Aaj ka hisaab?', 'Aaj']));
  });
});
