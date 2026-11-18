import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { subscribeToEntryChanges } from '../entries/entryEvents';
import { QuickAddScreen, SAVED_CONFIRMATION_MS } from './QuickAddScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockRepositoryGetter() }));

describe('QuickAddScreen', () => {
  let repository: SQLiteTransactionRepository;
  const onClose = jest.fn();

  beforeEach(async () => {
    jest.useFakeTimers();
    onClose.mockClear();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database, { idFactory: () => 'quick-1' });
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
  });
  afterEach(() => jest.useRealTimers());

  const render = (initialType: 'expense' | 'income' = 'expense') => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<QuickAddScreen initialType={initialType} onClose={onClose} />);
    });
    return renderer!;
  };
  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      target.props.onPress();
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    });
  };
  const type = (renderer: ReactTestRenderer.ReactTestRenderer, value: string) =>
    ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Quick amount' }).props.onChangeText(value));
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)));

  it('saves an expense with just amount and category, tells open screens, then closes', async () => {
    const changed = jest.fn();
    const unsubscribe = subscribeToEntryChanges(changed);
    const renderer = render();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Quick amount' }).props.autoFocus).toBe(true);

    type(renderer, '500');
    await press(renderer, 'Quick category Fuel');
    await press(renderer, 'Quick save');

    const [saved] = await repository.listTransactions();
    expect(saved).toMatchObject({ type: 'expense', amountPaise: 50000, category: 'Fuel' });
    expect(await repository.getById('quick-1', 'expense')).toMatchObject({ source: 'QUICK' });
    expect(changed).toHaveBeenCalledTimes(1);
    expect(texts(renderer)).toContain('−₹500 saved');

    expect(onClose).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(SAVED_CONFIRMATION_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('saves income and resets the category when switching type', async () => {
    const renderer = render('expense');
    await press(renderer, 'Quick category Food & Dining');
    await press(renderer, 'Income entry');
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Quick category Salary' }).length).toBeGreaterThan(0);
    type(renderer, '100000');
    await press(renderer, 'Quick save');
    expect(texts(renderer)).toContain('Category chuno.');
    await press(renderer, 'Quick category Salary');
    await press(renderer, 'Quick save');
    expect((await repository.listTransactions()).map(item => [item.type, item.amountPaise, item.category])).toEqual([
      ['income', 10000000, 'Salary'],
    ]);
  });

  it('asks for an amount and never saves without one', async () => {
    const renderer = render();
    await press(renderer, 'Quick category Fuel');
    await press(renderer, 'Quick save');
    expect(texts(renderer)).toContain('Amount daalo.');
    expect(await repository.listTransactions()).toHaveLength(0);
  });

  it('closes when the dimmed area or ✕ is tapped', async () => {
    const renderer = render();
    const closers = renderer.root.findAll(node => node.props.accessibilityLabel === 'Close quick add' && typeof node.props.onPress === 'function');
    expect(closers.length).toBe(2);
    ReactTestRenderer.act(() => closers[0].props.onPress());
    ReactTestRenderer.act(() => closers[1].props.onPress());
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
