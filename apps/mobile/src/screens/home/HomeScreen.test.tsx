import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { notifyEntriesChanged } from '../../features/entries/entryEvents';
import { VoiceEntrySheet } from '../../features/voice/VoiceEntrySheet';
import { isPrivacyOn } from '../../features/privacy/privacy';
import { HomeScreen } from './HomeScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const mockNavigate = jest.fn();
const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();

jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (callback: () => void | (() => void)) =>
      ReactRuntime.useEffect(callback, [callback]),
  };
});
jest.mock('../../database/transactionRepository', () => ({
  getDatabase: () => Promise.resolve({ execute: jest.fn().mockResolvedValue({ rows: [] }) }),
  getTransactionRepository: () => mockRepositoryGetter(),
}));
jest.mock('../../features/voice/speech', () => ({ startSpeech: () => new Promise(() => undefined) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('HomeScreen monthly summary', () => {
  let repository: SQLiteTransactionRepository;
  let ids = 0;

  beforeEach(async () => {
    ids = 0;
    mockNavigate.mockClear();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database, { idFactory: () => `home-${++ids}` });
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
  });

  const render = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    return renderer!;
  };

  const textOf = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const node = renderer.root.find(item => item.props.accessibilityLabel === label && item.type === Text);
    return String(node.props.children);
  };

  it('shows income, total spent and a positive remaining amount', async () => {
    await repository.createIncome({ amountPaise: 200000_00, category: 'Salary' });
    await repository.createExpense({ amountPaise: 50000_00, category: 'Rent' });
    await repository.createExpense({ amountPaise: 12000_00, category: 'Groceries' });
    await repository.createExpense({ amountPaise: 3000_00, category: 'Bills' });

    const renderer = await render();

    expect(textOf(renderer, 'Total income')).toBe('+₹2,00,000');
    expect(textOf(renderer, 'Total spent')).toBe('−₹65,000');
    expect(textOf(renderer, 'Remaining amount')).toBe('+₹1,35,000');
  });

  it('shows -- instead of amounts while privacy mode is on', async () => {
    await repository.createIncome({ amountPaise: 200000_00, category: 'Salary' });
    await repository.createExpense({ amountPaise: 50000_00, category: 'Rent' });
    const { setPrivacyOn } = require('../../features/privacy/privacy');
    setPrivacyOn(true);
    expect(isPrivacyOn()).toBe(true);
    const renderer = await render();
    expect(textOf(renderer, 'Total income')).toBe('--');
    expect(textOf(renderer, 'Total spent')).toBe('--');
    expect(textOf(renderer, 'Remaining amount')).toBe('--');
    const shown = renderer.root.findAllByType(Text).map(item => String(item.props.children)).join(' ');
    expect(shown).not.toContain('₹');
    await ReactTestRenderer.act(async () => setPrivacyOn(false));
    expect(textOf(renderer, 'Total income')).toBe('+₹2,00,000');
  });
  it('shows a negative remaining amount when spending exceeds income', async () => {
    await repository.createIncome({ amountPaise: 10000_00, category: 'Salary' });
    await repository.createExpense({ amountPaise: 15000_00, category: 'Rent' });

    const renderer = await render();

    expect(textOf(renderer, 'Remaining amount')).toBe('−₹5,000');
  });

  it('shows zero for an empty month and an empty-state hint', async () => {
    const renderer = await render();
    expect(textOf(renderer, 'Remaining amount')).toBe('₹0');
    const texts = renderer.root.findAllByType(Text).map(item => String(item.props.children));
    expect(texts.some(value => value.startsWith('No entries yet'))).toBe(true);
  });

  it('switches to the previous month, which is empty, and cannot move past the current month', async () => {
    await repository.createIncome({ amountPaise: 100_00, category: 'Salary' });
    const renderer = await render();
    expect(textOf(renderer, 'Total income')).toBe('+₹100');

    const next = renderer.root.find(item => item.props.accessibilityLabel === 'Next month' && typeof item.props.onPress === 'function');
    expect(next.props.disabled).toBe(true);

    const previous = renderer.root.find(item => item.props.accessibilityLabel === 'Previous month' && typeof item.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      previous.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textOf(renderer, 'Total income')).toBe('+₹0');
    expect(textOf(renderer, 'Remaining amount')).toBe('₹0');
  });

  it('opens the add form for income and expense and navigates to Profile', async () => {
    const renderer = await render();
    const press = (label: string) => {
      const target = renderer.root.find(item => item.props.accessibilityLabel === label && typeof item.props.onPress === 'function');
      ReactTestRenderer.act(() => target.props.onPress());
    };
    press('Add income');
    expect(mockNavigate).toHaveBeenLastCalledWith('AddExpense', { type: 'income' });
    press('Add expense');
    expect(mockNavigate).toHaveBeenLastCalledWith('AddExpense', { type: 'expense' });
    press('Open Profile');
    expect(mockNavigate).toHaveBeenLastCalledWith('Profile');
  });

  const settle = async (fn: () => void) => {
    await ReactTestRenderer.act(async () => {
      fn();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it('shows the whole year with a month-by-month breakdown and opens a month', async () => {
    const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date()));
    await repository.createIncome({ amountPaise: 200000_00, category: 'Salary', occurredAt: `${thisYear}-01-01T06:00:00.000Z` });
    await repository.createExpense({ amountPaise: 65000_00, category: 'Rent', occurredAt: `${thisYear}-01-05T06:00:00.000Z` });
    await repository.createExpense({ amountPaise: 1000_00, category: 'Food', occurredAt: `${thisYear - 1}-12-20T06:00:00.000Z` });

    const renderer = await render();
    const press = (label: string) => renderer.root.find(item => item.props.accessibilityLabel === label && typeof item.props.onPress === 'function');
    await settle(() => press('Year view').props.onPress());

    expect(textOf(renderer, 'Selected period')).toBe(String(thisYear));
    expect(textOf(renderer, 'Total income')).toBe('+₹2,00,000');
    expect(textOf(renderer, 'Total spent')).toBe('−₹65,000');
    expect(textOf(renderer, 'Remaining amount')).toBe('+₹1,35,000');
    expect(textOf(renderer, 'Jan remaining')).toBe('+₹1,35,000');
    expect(press('Next year').props.disabled).toBe(true);

    await settle(() => press('Previous year').props.onPress());
    expect(textOf(renderer, 'Total spent')).toBe('−₹1,000');
    expect(textOf(renderer, 'Remaining amount')).toBe('−₹1,000');

    await settle(() => press(`Open December ${thisYear - 1}`).props.onPress());
    expect(textOf(renderer, 'Selected period')).toBe(`December ${thisYear - 1}`);
    expect(textOf(renderer, 'Remaining amount')).toBe('−₹1,000');
  });

  it('opens an entry for editing when its row is tapped', async () => {
    const income = await repository.createIncome({ amountPaise: 1000_00, category: 'Salary', sourceName: 'Company' });
    const renderer = await render();
    const row = renderer.root.find(item => item.props.accessibilityLabel === 'Edit income Company' && typeof item.props.onPress === 'function');
    ReactTestRenderer.act(() => row.props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith('AddExpense', { type: 'income', editId: income.id });
  });

  it('opens voice entry in one tap and refreshes when entries change elsewhere', async () => {
    const renderer = await render();
    expect(renderer.root.findByType(VoiceEntrySheet).props.visible).toBe(false);
    const voice = renderer.root.find(item => item.props.accessibilityLabel === 'Add by voice' && typeof item.props.onPress === 'function');
    await settle(() => voice.props.onPress());
    expect(renderer.root.findByType(VoiceEntrySheet).props.visible).toBe(true);

    // Entries saved elsewhere (voice sheet, quick-add window) refresh Home via the change event.
    await repository.createExpense({ amountPaise: 500_00, category: 'Fuel' });
    await settle(() => notifyEntriesChanged());
    expect(textOf(renderer, 'Total spent')).toBe('−₹500');
  });
  it('keeps statements off the dashboard; they live in their own tab', async () => {
    const renderer = await render();
    expect(renderer.root.findAll(item => item.props.accessibilityLabel === 'Open statement')).toHaveLength(0);
    const tabs = renderer.root.findByType(BottomNavigation);
    expect(tabs.props.items.map((item: { id: string }) => item.id)).toEqual(['home', 'transactions', 'add', 'statement', 'profile']);
    ReactTestRenderer.act(() => tabs.props.onSelect('statement'));
    expect(mockNavigate).toHaveBeenLastCalledWith('Statement');
  });
});
