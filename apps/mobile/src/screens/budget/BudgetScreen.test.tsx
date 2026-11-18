import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteCatalogRepository } from '../../database/repositories/CatalogRepository';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { BudgetHomeCard } from '../../features/budget/BudgetHomeCard';
import { getCatalog, loadCatalog, resetCatalogForTests } from '../../features/catalog/catalogStore';
import { BudgetScreen } from './BudgetScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  return {
    useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
    useFocusEffect: (callback: () => void) => ReactRuntime.useEffect(callback, [callback]),
  };
});
const mockTransactions = jest.fn<Promise<TransactionRepository>, []>();
const mockCatalog = jest.fn<Promise<SQLiteCatalogRepository>, []>();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockTransactions() }));
jest.mock('../../database/catalogRepository', () => ({ getCatalogRepository: () => mockCatalog() }));
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({ showSnackbar: (options: unknown) => mockSnackbar(options) }));

describe('Budget', () => {
  let transactions: SQLiteTransactionRepository;

  beforeEach(async () => {
    resetCatalogForTests();
    mockSnackbar.mockClear();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    let ids = 0;
    transactions = new SQLiteTransactionRepository(database);
    mockTransactions.mockReset().mockResolvedValue(transactions);
    mockCatalog.mockReset().mockResolvedValue(new SQLiteCatalogRepository(database, { idFactory: () => `b-${++ids}` }));
    await transactions.createExpense({ amountPaise: 6500_00, category: 'Food & Dining' });
    await loadCatalog(true);
  });

  const flush = async () => {
    await ReactTestRenderer.act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
  };
  const render = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<BudgetScreen />);
    });
    await flush();
    return renderer!;
  };
  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      target.props.onPress();
    });
    await flush();
  };
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)));

  it('explains budgets are optional and starts empty', async () => {
    const renderer = await render();
    expect(texts(renderer).join(' ')).toContain('Optional hai');
    expect(texts(renderer)).toContain('Koi budget nahi hai');
  });

  it('creates a category budget and shows what is spent and left this month', async () => {
    const renderer = await render();
    await press(renderer, 'Create first budget');
    await press(renderer, 'Budget category Food & Dining');
    const limit = renderer.root.findByProps({ accessibilityLabel: 'Budget limit' });
    await ReactTestRenderer.act(async () => limit.props.onChangeText('8000'));
    await press(renderer, 'Save budget');

    expect(getCatalog().budgets).toEqual([expect.objectContaining({ category: 'Food & Dining', limitPaise: 8000_00 })]);
    expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Food & Dining budget save ho gaya' });
    const shown = texts(renderer);
    expect(shown).toContain('₹6,500 / ₹8,000');
    expect(shown).toContain('₹1,500 bacha');
  });

  it('asks for a category and a limit before saving', async () => {
    const renderer = await render();
    await press(renderer, 'Create first budget');
    await press(renderer, 'Save budget');
    expect(texts(renderer)).toContain('Category chuno.');
    await press(renderer, 'Budget category Sab kharche');
    await press(renderer, 'Save budget');
    expect(texts(renderer)).toContain('Mahine ki limit daalo, jaise 8000.');
    expect(getCatalog().budgets).toEqual([]);
  });

  it('edits and deletes a budget after confirmation', async () => {
    const repository = await mockCatalog();
    await repository.setBudget('Food & Dining', 8000_00);
    await loadCatalog(true);
    const renderer = await render();
    await press(renderer, 'Edit Food & Dining budget');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find(button => button.text === 'Hatao')?.onPress?.();
    });
    await press(renderer, 'Delete budget');
    await flush();
    expect(alert).toHaveBeenCalled();
    expect(getCatalog().budgets).toEqual([]);
    alert.mockRestore();
  });

  it('home card renders nothing without budgets and a summary with them', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<BudgetHomeCard budgets={[]} monthExpenses={[]} onOpen={jest.fn()} />);
    });
    expect(renderer!.toJSON()).toBeNull();

    const onOpen = jest.fn();
    ReactTestRenderer.act(() => {
      renderer!.update(
        <BudgetHomeCard
          budgets={[{ id: 'x', category: 'Fuel', limitPaise: 2000_00, createdAt: '1' }]}
          monthExpenses={[{ category: 'Fuel', amountPaise: 2500_00 }]}
          onOpen={onOpen}
        />,
      );
    });
    expect(texts(renderer!)).toContain('₹500 zyada');
    renderer!.root.findByProps({ accessibilityLabel: 'Open budget' }).props.onPress();
    expect(onOpen).toHaveBeenCalled();
  });
});
