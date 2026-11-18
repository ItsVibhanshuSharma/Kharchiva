import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { CalendarPicker } from '../../components/CalendarPicker';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { StatementScreen } from './StatementScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockRepositoryGetter() }));

const mockCreate = jest.fn();
const mockSave = jest.fn();
const mockShare = jest.fn();
const mockOpen = jest.fn();
const mockSnackbar = jest.fn();
jest.mock('../../components/snackbar', () => ({ showSnackbar: (options: unknown) => mockSnackbar(options) }));
let mockCanSave = true;
jest.mock('../../features/statement/shareStatement', () => ({
  createStatementPdf: (...args: unknown[]) => mockCreate(...args),
  saveStatementToDownloads: (...args: unknown[]) => mockSave(...args),
  openSavedStatement: (...args: unknown[]) => mockOpen(...args),
  shareStatementPdf: (...args: unknown[]) => mockShare(...args),
  canSaveToDownloads: () => mockCanSave,
}));

// Wednesday, 18 Nov 2026 12:00 IST.
const NOW = new Date('2026-11-18T06:30:00.000Z');

describe('StatementScreen', () => {
  let repository: SQLiteTransactionRepository;

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    mockCanSave = true;
    [mockCreate, mockSave, mockShare, mockOpen, mockSnackbar].forEach(fn => fn.mockReset());
    mockOpen.mockResolvedValue(undefined);
    mockCreate.mockResolvedValue({ filePath: '/cache/x.pdf', base64: 'AAA', fileName: 'Kharchiva-Statement', title: 'T' });
    mockSave.mockResolvedValue('content://media/external/downloads/42');
    mockShare.mockResolvedValue(undefined);
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database);
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
    await repository.createIncome({ amountPaise: 100000_00, category: 'Salary', occurredAt: '2026-11-01T05:00:00.000Z' });
    await repository.createExpense({ amountPaise: 500_00, category: 'Fuel', occurredAt: '2026-11-15T05:00:00.000Z' });
    await repository.createExpense({ amountPaise: 7000_00, category: 'Bills', occurredAt: '2026-10-10T05:00:00.000Z' });
  });
  afterEach(() => jest.useRealTimers());

  const flush = async () => {
    await ReactTestRenderer.act(async () => {
      for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
  };
  const render = async (params?: { from?: string; to?: string }) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StatementScreen route={{ params }} />);
    });
    await flush();
    return renderer!;
  };
  const text = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
    String(renderer.root.find(node => node.props.accessibilityLabel === label && node.type === Text).props.children);
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)));
  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      target.props.onPress();
    });
    await flush();
  };

  it('starts on this month and previews totals for the range', async () => {
    const renderer = await render();
    expect(text(renderer, 'Start date')).toBe('1 Nov 2026');
    expect(text(renderer, 'End date')).toBe('18 Nov 2026');
    expect(text(renderer, 'Statement income')).toBe('+₹1,00,000');
    expect(text(renderer, 'Statement spent')).toBe('−₹500');
    expect(text(renderer, 'Statement balance')).toBe('+₹99,500');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Range This month' }).props.accessibilityState.selected).toBe(true);
  });

  it('switches to a preset like last month', async () => {
    const renderer = await render();
    await press(renderer, 'Range Last month');
    expect(text(renderer, 'Statement title')).toBe('October 2026');
    expect(text(renderer, 'Statement spent')).toBe('−₹7,000');
    expect(text(renderer, 'Statement income')).toBe('+₹0');
  });

  it('picks a custom range with the calendar, never letting "to" come before "from"', async () => {
    const renderer = await render();
    await press(renderer, 'Choose start date');
    const calendar = () => renderer.root.findByType(CalendarPicker);
    expect(calendar().props.visible).toBe(true);
    expect(calendar().props.minDate).toBeUndefined();
    await ReactTestRenderer.act(async () => calendar().props.onSelect('2026-11-09'));
    await flush();
    expect(text(renderer, 'Statement title')).toBe('9 Nov – 18 Nov 2026');
    expect(texts(renderer)).toContain('Custom');
    expect(text(renderer, 'Statement spent')).toBe('−₹500');

    await press(renderer, 'Choose end date');
    expect(calendar().props.minDate).toBe('2026-11-09');
    expect(calendar().props.maxDate).toBe('2026-11-18');
  });

  it('opens on the range passed from Home and clamps it to today', async () => {
    const renderer = await render({ from: '2026-01-01', to: '2026-12-31' });
    expect(text(renderer, 'End date')).toBe('18 Nov 2026');
    expect(text(renderer, 'Statement spent')).toBe('−₹7,500');
  });

  it('downloads into Downloads, confirms with a snackbar and opens the file from it', async () => {
    const renderer = await render();
    await press(renderer, 'Download statement PDF');
    // No placeholder user name is passed into the PDF.
    expect(mockCreate).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-18' }, expect.any(Array));
    expect(mockCreate.mock.calls[0][1]).toHaveLength(2);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockShare).not.toHaveBeenCalled();

    expect(mockSnackbar).toHaveBeenCalledTimes(1);
    const snackbar = mockSnackbar.mock.calls[0][0];
    expect(snackbar).toMatchObject({ message: 'Statement Downloads mein save ho gaya', action: { label: 'Kholo' } });
    expect(snackbar.message).not.toContain('.pdf');
    snackbar.action.onPress();
    expect(mockOpen).toHaveBeenCalledWith('content://media/external/downloads/42');
  });

  it('shares, and falls back to sharing when Downloads is not available', async () => {
    const renderer = await render();
    await press(renderer, 'Share statement PDF');
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockSave).not.toHaveBeenCalled();

    mockCanSave = false;
    await press(renderer, 'Download statement PDF');
    expect(mockShare).toHaveBeenCalledTimes(2);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('shows an error when the PDF fails and disables buttons for an empty range', async () => {
    mockCreate.mockRejectedValueOnce(new Error('boom'));
    const renderer = await render();
    await press(renderer, 'Download statement PDF');
    expect(mockSnackbar).toHaveBeenCalledWith({ tone: 'error', message: 'Statement nahi ban paya. Phir try karo.' });

    await press(renderer, 'Range Last year');
    expect(texts(renderer)).toContain('Is period mein koi entry nahi hai. Dusri dates chuno.');
    const download = renderer.root.find(node => node.props.accessibilityLabel === 'Download statement PDF' && typeof node.props.onPress === 'function');
    expect(download.props.disabled).toBe(true);
  });

  it('is a bottom tab with Statement marked active', async () => {
    const renderer = await render();
    const tabs = renderer.root.findByType(BottomNavigation);
    expect(tabs.props.items.find((item: { id: string; active?: boolean }) => item.active).id).toBe('statement');
    ReactTestRenderer.act(() => tabs.props.onSelect('home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});
