import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteRecurringRepository } from '../../database/repositories/RecurringRepository';
import { SQLiteTransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { RecurringSheet } from './RecurringSheet';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockTransactions = jest.fn();
const mockRecurring = jest.fn();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockTransactions() }));
jest.mock('../../database/recurringRepository', () => ({ getRecurringRepository: () => mockRecurring() }));
jest.mock('../catalog/catalogStore', () => ({
  useCatalog: () => ({ categories: [], paymentSources: [], budgets: [] }),
  categoryNames: (_: unknown, type: string) => (type === 'income' ? ['Salary'] : ['Housing', 'Bills']),
  customCategoryFor: () => undefined,
}));
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({ showSnackbar: (options: unknown) => mockSnackbar(options) }));

describe('RecurringSheet', () => {
  let recurring: SQLiteRecurringRepository;

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-11-18T04:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    recurring = new SQLiteRecurringRepository(database);
    mockTransactions.mockResolvedValue(new SQLiteTransactionRepository(database));
    mockRecurring.mockResolvedValue(recurring);
    mockSnackbar.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
      for (let i = 0; i < 20; i += 1) await Promise.resolve();
    });
  };
  const type = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string, value: string) => {
    await ReactTestRenderer.act(async () => renderer.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value));
  };

  it('asks for missing fields, then saves and adds today right away', async () => {
    const onClose = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<RecurringSheet visible editing={null} onClose={onClose} />);
    });
    const texts = () => renderer!.root.findAllByType(Text).map(node => String(node.props.children));

    await press(renderer!, 'Save recurring');
    expect(texts()).toContain('Naam likho, jaise Rent ya Netflix.');
    await type(renderer!, 'Recurring name', 'Rent');
    await press(renderer!, 'Save recurring');
    expect(texts()).toContain('Amount daalo.');
    await type(renderer!, 'Recurring amount', '15000');
    await press(renderer!, 'Save recurring');
    expect(texts()).toContain('Category chuno.');
    expect(await recurring.list()).toEqual([]);

    await press(renderer!, 'Recurring category Housing');
    await press(renderer!, 'Save recurring');
    expect(await recurring.list()).toEqual([
      expect.objectContaining({ name: 'Rent', amountPaise: 15_000_00, category: 'Housing', frequency: 'MONTHLY', startDate: '2026-11-18', nextDate: '2026-12-18' }),
    ]);
    expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Rent save ho gaya, aaj ki entry bhi jud gayi' });
    expect(onClose).toHaveBeenCalled();
  });
});
