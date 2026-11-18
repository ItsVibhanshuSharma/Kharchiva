import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {BottomNavigation} from '../../components/BottomNavigation';
import {Text} from '../../components/Text';
import {initializeDatabase} from '../../database/initialize';
import {SQLiteTransactionRepository, type TransactionRepository} from '../../database/repositories/TransactionRepository';
import {InMemoryFinancialDatabase} from '../../database/testing/InMemoryFinancialDatabase';
import {TransactionsScreen} from './TransactionsScreen';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));

const mockNavigate = jest.fn();
const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();
jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  return {
    useNavigation: () => ({navigate: mockNavigate}),
    useFocusEffect: (callback: () => void) => ReactRuntime.useEffect(callback, [callback]),
  };
});
jest.mock('../../database/transactionRepository', () => ({getTransactionRepository: () => mockRepositoryGetter()}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0})}));

describe('TransactionsScreen with local SQLite repository', () => {
  let repository: SQLiteTransactionRepository;

  beforeEach(async () => {
    mockNavigate.mockClear();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database, {now: () => new Date('2026-10-13T08:00:00.000Z')});
    await repository.createExpense({amountPaise: 124000, category: 'Groceries', merchant: 'Supermarket Groceries', paymentSource: 'UPI', occurredAt: '2026-09-28T10:00:00+05:30'});
    await repository.createExpense({amountPaise: 85000, category: 'Food & Dining', merchant: 'Food & Dining', paymentSource: 'Cash', occurredAt: '2026-09-28T11:00:00+05:30'});
    await repository.createIncome({amountPaise: 2200000, category: 'Income', sourceName: 'Salary', occurredAt: '2026-09-27T09:00:00+05:30'});
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
  });

  const renderScreen = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<TransactionsScreen />);
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!renderer) throw new Error('Transactions screen did not render');
    return renderer;
  };

  const renderedText = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text)
    .map(item => Array.isArray(item.props.children) ? item.props.children.join('') : String(item.props.children ?? ''))
    .join(' ');

  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(item => item.props.accessibilityLabel === label && typeof item.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {target.props.onPress(); await Promise.resolve(); await Promise.resolve();});
  };

  it('loads persisted expense and income rows grouped by date', async () => {
    const renderer = await renderScreen();
    expect(renderedText(renderer)).toContain('3 transactions');
    expect(renderedText(renderer)).toContain('Supermarket Groceries');
    expect(renderedText(renderer)).toContain('Salary');
    expect(renderedText(renderer)).toContain('Local · not synced');
  });

  it('filters by type, date and category and searches ledger content', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Expenses');
    expect(renderedText(renderer)).toContain('2 transactions');
    expect(renderedText(renderer)).not.toContain('Salary');
    await press(renderer, 'All');
    const search = renderer.root.find(item => item.props.accessibilityLabel === 'Search transactions');
    ReactTestRenderer.act(() => search.props.onChangeText('salary'));
    expect(renderedText(renderer)).toContain('Salary');
    ReactTestRenderer.act(() => search.props.onChangeText(''));
    await press(renderer, 'Filter by category');
    await press(renderer, 'Food & Dining');
    expect(renderedText(renderer)).toContain('Food & Dining');
    expect(renderedText(renderer)).not.toContain('Supermarket Groceries');
    await press(renderer, 'Filter by date');
    const monthLabel = new Date('2026-09-01T00:00:00').toLocaleDateString('en-IN', {month: 'long', year: 'numeric'});
    await press(renderer, monthLabel);
    expect(renderedText(renderer)).toContain('1 transaction');
  });

  it('shows empty and retryable error states', async () => {
    const list = jest.spyOn(repository, 'listTransactions').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce([]);
    const renderer = await renderScreen();
    expect(renderedText(renderer)).toContain('Couldn’t load transactions');
    await press(renderer, 'Retry loading transactions');
    expect(renderedText(renderer)).toContain('No transactions found');
    list.mockRestore();
  });

  it('opens an entry straight in the edit form with a single tap', async () => {
    const renderer = await renderScreen();
    const [groceries] = (await repository.listTransactions()).filter(item => item.title === 'Supermarket Groceries');
    mockNavigate.mockClear();
    await press(renderer, 'Edit expense Supermarket Groceries');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('AddExpense', {type: 'expense', editId: groceries.id});
    // No intermediate details popup.
    expect(renderedText(renderer)).not.toContain('Transaction details');
  });

  it('refreshes the list when returning after an edit or delete', async () => {
    const renderer = await renderScreen();
    expect(renderedText(renderer)).toContain('Supermarket Groceries');
    const [groceries] = (await repository.listTransactions()).filter(item => item.title === 'Supermarket Groceries');
    await repository.deleteTransaction(groceries.id, 'expense');
    await ReactTestRenderer.act(async () => {
      renderer.update(<TransactionsScreen key="refocus" />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderedText(renderer)).not.toContain('Supermarket Groceries');
    expect(renderedText(renderer)).toContain('2 transactions');
  });

  it('retains profile and shared bottom navigation actions', async () => {
    const renderer = await renderScreen();
    const profile = renderer.root.findAll(item => item.props.accessibilityLabel === 'Profile' && typeof item.props.onPress === 'function')[0];
    await ReactTestRenderer.act(async () => {profile.props.onPress();});
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
    const navigation = renderer.root.findByType(BottomNavigation);
    expect(navigation.props.items.map((item: {id: string}) => item.id)).toEqual(['home', 'transactions', 'add', 'statement', 'profile']);
  });
});
