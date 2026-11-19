import React from 'react';
import {Alert} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from '../../components/Text';
import {initializeDatabase} from '../../database/initialize';
import {SQLiteTransactionRepository, type TransactionRepository} from '../../database/repositories/TransactionRepository';
import {InMemoryFinancialDatabase} from '../../database/testing/InMemoryFinancialDatabase';
import {TransactionsScreen} from '../transactions/TransactionsScreen';
import {CalendarPicker} from '../../components/CalendarPicker';
import {SQLiteCatalogRepository} from '../../database/repositories/CatalogRepository';
import {SQLiteSplitRepository} from '../../database/repositories/SplitRepository';
import {resetCatalogForTests} from '../../features/catalog/catalogStore';
import {AddExpenseScreen} from './AddExpenseScreen';
import {dateForExpenseInput} from './expenseInputUtils';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSelect = jest.fn();
const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();
jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  return {
    useNavigation: () => ({goBack: mockGoBack, navigate: mockNavigate}),
    useFocusEffect: (callback: () => void) => ReactRuntime.useEffect(callback, [callback]),
  };
});
const mockCelebrate = jest.fn();
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({showSnackbar: (options: unknown) => mockSnackbar(options)}));
jest.mock('../../components/celebration', () => ({celebrate: (event: unknown) => mockCelebrate(event)}));
const mockBudgetCheck = jest.fn();
jest.mock('../../features/budget/budgetCheck', () => ({checkBudgetsAfterExpense: (expense: unknown) => mockBudgetCheck(expense)}));
const mockCatalogRepo = jest.fn();
const mockSplitRepo = jest.fn();
// Saving an expense also clears or writes its split, so the split store needs a database too.
jest.mock('../../database/splitRepository', () => ({getSplitRepository: () => mockSplitRepo()}));
jest.mock('../../database/catalogRepository', () => ({getCatalogRepository: () => mockCatalogRepo()}));
jest.mock('../../database/transactionRepository', () => ({getTransactionRepository: () => mockRepositoryGetter()}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0})}));

describe('Add Expense to SQLite to Transactions ledger', () => {
  let repository: SQLiteTransactionRepository;
  beforeEach(async () => {
    mockGoBack.mockClear();
    mockCelebrate.mockClear();
    mockBudgetCheck.mockClear();
    resetCatalogForTests();
    mockSnackbar.mockClear();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database, {idFactory: () => 'expense-integration-1', now: () => new Date('2026-10-13T08:00:00.000Z')});
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
    mockCatalogRepo.mockReset().mockResolvedValue(new SQLiteCatalogRepository(database, {idFactory: () => 'cat-1'}));
    mockSplitRepo.mockReset().mockResolvedValue(new SQLiteSplitRepository(database));
  });

  const textContent = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text)
    .map(item => Array.isArray(item.props.children) ? item.props.children.join('') : String(item.props.children ?? ''))
    .join(' ');

  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(item => item.props.accessibilityLabel === label && typeof item.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {target.props.onPress(); await Promise.resolve(); await Promise.resolve();});
  };

  it('rejects invalid amount and saves a valid local expense that appears in the ledger', async () => {
    let addRenderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {addRenderer = ReactTestRenderer.create(<AddExpenseScreen />);});
    const amount = addRenderer!.root.findByProps({accessibilityLabel: 'Expense amount'});
    ReactTestRenderer.act(() => amount.props.onChangeText('0'));
    await press(addRenderer!, 'Save Expense');
    expect(textContent(addRenderer!)).toContain('Enter an amount greater than ₹0');
    expect(await repository.listTransactions()).toHaveLength(0);

    ReactTestRenderer.act(() => amount.props.onChangeText('1234.56'));
    const merchant = addRenderer!.root.findByProps({accessibilityLabel: 'Merchant'});
    ReactTestRenderer.act(() => merchant.props.onChangeText('Local Cafe'));
    await press(addRenderer!, 'Date Yesterday');
    const note = addRenderer!.root.findByProps({accessibilityLabel: 'Expense note'});
    ReactTestRenderer.act(() => note.props.onChangeText('Lunch with team'));
    await press(addRenderer!, 'Category Travel');
    await press(addRenderer!, 'Payment source Cash');
    await press(addRenderer!, 'Save Expense');

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(await repository.getById('expense-integration-1', 'expense')).toMatchObject({
      amountPaise: 123456, category: 'Travel', merchant: 'Local Cafe', paymentSource: 'Cash', note: 'Lunch with team',
    });

    let ledgerRenderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      ledgerRenderer = ReactTestRenderer.create(<TransactionsScreen />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textContent(ledgerRenderer!)).toContain('Local Cafe');
    expect(textContent(ledgerRenderer!)).toContain('−₹1,234.56');
    expect(textContent(ledgerRenderer!)).toContain('Cash');
  });
  it('saves an income entry that shows with a plus sign in the ledger', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AddExpenseScreen route={{params: {type: 'income'}}} />);});
    expect(textContent(renderer!)).toContain('RECEIVED AMOUNT');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Merchant'})).toHaveLength(0);
    const amount = renderer!.root.findByProps({accessibilityLabel: 'Income amount'});
    expect(amount.props.value).toBe('');
    ReactTestRenderer.act(() => amount.props.onChangeText('200000'));
    ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: 'Income source'}).props.onChangeText('Company'));
    await press(renderer!, 'Save Income');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(await repository.getById('expense-integration-1', 'income')).toMatchObject({
      amountPaise: 20000000, category: 'Salary', sourceName: 'Company',
    });
    expect(mockCelebrate).toHaveBeenCalledWith({type: 'income', category: 'Salary', amountPaise: 20000000});
    let ledger: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      ledger = ReactTestRenderer.create(<TransactionsScreen />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textContent(ledger!)).toContain('+₹2,00,000');
  });

  it('switches between expense and income and resets the category', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AddExpenseScreen />);});
    expect(textContent(renderer!)).toContain('SPENT AMOUNT');
    await press(renderer!, 'Income entry');
    expect(textContent(renderer!)).toContain('RECEIVED AMOUNT');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Category Salary'}).length).toBeGreaterThan(0);
    await press(renderer!, 'Expense entry');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Category Food & Dining'}).length).toBeGreaterThan(0);
  });

  it('backdates an entry two months using the calendar and blocks future days', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AddExpenseScreen route={{params: {type: 'expense'}}} />);});
    const today = dateForExpenseInput(new Date());
    expect(textContent(renderer!)).toContain('Today');

    await press(renderer!, 'Open calendar');
    const calendar = renderer!.root.findByType(CalendarPicker);
    expect(calendar.props.visible).toBe(true);
    expect(calendar.props.maxDate).toBe(today);
    expect(renderer!.root.find(item => item.props.accessibilityLabel === 'Next calendar month' && typeof item.props.onPress === 'function').props.disabled).toBe(true);

    await press(renderer!, 'Previous calendar month');
    await press(renderer!, 'Previous calendar month');
    const [year, month] = today.split('-').map(Number);
    const index = year * 12 + (month - 1) - 2;
    const target = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-10`;
    await press(renderer!, `Pick ${target}`);
    expect(renderer!.root.findByType(CalendarPicker).props.visible).toBe(false);

    ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: 'Expense amount'}).props.onChangeText('750'));
    await press(renderer!, 'Save Expense');
    const [saved] = await repository.listTransactions({type: 'expense'});
    expect(saved.dateGroup).toBe(target);
    expect(saved.amountPaise).toBe(75000);
  });

  it('disables days after today in the calendar', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <CalendarPicker maxDate="2026-11-17" onClose={jest.fn()} onSelect={jest.fn()} value="2026-11-17" visible />,
      );
    });
    const day = (date: string) => renderer!.root.find(item => item.props.accessibilityLabel === `Pick ${date}` && typeof item.props.onPress === 'function');
    expect(day('2026-11-17').props.disabled).toBe(false);
    expect(day('2026-11-18').props.disabled).toBe(true);
  });

  it('jumps straight to a month a year back via the month/year picker', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <CalendarPicker maxDate="2026-11-17" onClose={jest.fn()} onSelect={mockSelect} value="2026-11-17" visible />,
      );
    });
    const find = (label: string) => renderer!.root.find(item => item.props.accessibilityLabel === label && typeof item.props.onPress === 'function');
    await press(renderer!, 'Choose month and year');
    expect(find('Next calendar year').props.disabled).toBe(true);
    expect(find('Choose Dec 2026').props.disabled).toBe(true);
    await press(renderer!, 'Previous calendar year');
    await press(renderer!, 'Choose Mar 2025');
    expect(renderer!.root.findByProps({accessibilityLabel: 'Calendar month'}).props.children).toBe('March 2025');
    await press(renderer!, 'Pick 2025-03-15');
    expect(mockSelect).toHaveBeenCalledWith('2025-03-15');
  });

  it('edits an existing expense in place, keeping its time, and can delete it', async () => {
    const created = await repository.createExpense({amountPaise: 50000_00, category: 'Rent', merchant: 'Landlord', paymentSource: 'Bank', occurredAt: '2026-09-01T10:15:00.000Z'});
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<AddExpenseScreen route={{params: {type: 'expense', editId: created.id}}} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textContent(renderer!)).toContain('Edit Expense');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Income entry'})).toHaveLength(0);
    const amount = renderer!.root.findByProps({accessibilityLabel: 'Expense amount'});
    expect(amount.props.value).toBe('50000');
    expect(renderer!.root.findByProps({accessibilityLabel: 'Merchant'}).props.value).toBe('Landlord');
    // A non-default payment source stays selectable.
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Payment source Bank'}).length).toBeGreaterThan(0);
    expect(textContent(renderer!)).toContain('1 Sep 2026');

    ReactTestRenderer.act(() => amount.props.onChangeText('48000'));
    await press(renderer!, 'Save changes');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    const updated = await repository.getById(created.id, 'expense');
    expect(updated).toMatchObject({amountPaise: 48000_00, category: 'Rent', occurredAt: '2026-09-01T10:15:00.000Z'});
    // Edits are routine; no celebration.
    expect(mockCelebrate).not.toHaveBeenCalled();
    expect(mockSnackbar).toHaveBeenLastCalledWith({message: 'Changes save ho gaye'});
    expect(await repository.listTransactions()).toHaveLength(1);

    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === 'Delete')?.onPress?.();
    });
    await press(renderer!, 'Delete entry');
    await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(alert).toHaveBeenCalled();
    expect(await repository.listTransactions()).toHaveLength(0);
    expect(mockGoBack).toHaveBeenCalledTimes(2);
    expect(mockSnackbar).toHaveBeenLastCalledWith({message: 'Expense delete ho gaya'});
    alert.mockRestore();
  });

  it('adds a new category from the form and selects it, then checks budgets on save', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AddExpenseScreen />);});
    await press(renderer!, 'Add a new category');
    ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: 'New name'}).props.onChangeText('Gym'));
    await press(renderer!, 'Save new item');
    await ReactTestRenderer.act(async () => {for (let i = 0; i < 6; i += 1) await Promise.resolve();});
    expect(renderer!.root.findByProps({accessibilityLabel: 'Category Gym'}).props.accessibilityState.selected).toBe(true);

    ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: 'Expense amount'}).props.onChangeText('1500'));
    await press(renderer!, 'Save Expense');
    expect(await repository.getById('expense-integration-1', 'expense')).toMatchObject({category: 'Gym', amountPaise: 150000});
    expect(mockBudgetCheck).toHaveBeenCalledWith(expect.objectContaining({category: 'Gym', amountPaise: 150000}));
  });
});
