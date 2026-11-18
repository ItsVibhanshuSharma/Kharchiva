import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteTransactionRepository, type TransactionRepository } from '../../database/repositories/TransactionRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import type { SpeechHandlers } from './speech';
import { VoiceEntrySheet } from './VoiceEntrySheet';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));

const mockRepositoryGetter = jest.fn<Promise<TransactionRepository>, []>();
jest.mock('../../database/transactionRepository', () => ({ getTransactionRepository: () => mockRepositoryGetter() }));

const mockCelebrate = jest.fn();
jest.mock('../../components/celebration', () => ({ celebrate: (event: unknown) => mockCelebrate(event) }));

let mockHandlers: SpeechHandlers | null = null;
const mockStop = jest.fn(() => Promise.resolve());
const mockStart = jest.fn((handlers: SpeechHandlers) => {
  mockHandlers = handlers;
  return Promise.resolve(mockStop);
});
jest.mock('./speech', () => ({ startSpeech: (handlers: SpeechHandlers) => mockStart(handlers) }));

describe('VoiceEntrySheet', () => {
  let repository: SQLiteTransactionRepository;
  let ids = 0;
  const onSaved = jest.fn();
  const onClose = jest.fn();

  beforeEach(async () => {
    ids = 0;
    mockHandlers = null;
    [mockStart, mockStop, mockCelebrate, onSaved, onClose].forEach(fn => fn.mockClear());
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    repository = new SQLiteTransactionRepository(database, { idFactory: () => `voice-${++ids}` });
    mockRepositoryGetter.mockReset().mockResolvedValue(repository);
  });

  const flush = async () => {
    await ReactTestRenderer.act(async () => {
      for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
  };

  const open = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<VoiceEntrySheet onClose={onClose} onSaved={onSaved} visible />);
    });
    await flush();
    return renderer!;
  };

  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)));

  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      target.props.onPress();
    });
    await flush();
  };

  const say = async (text: string) => {
    await ReactTestRenderer.act(async () => {
      mockHandlers?.onPartial(text.slice(0, 5));
      mockHandlers?.onFinal(text);
    });
  };

  it('starts listening as soon as it opens', async () => {
    await open();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('turns speech into draft cards and saves them all in one tap', async () => {
    const renderer = await open();
    await say('kal 500 petrol aur 250 swiggy lunch');

    const shown = texts(renderer);
    expect(shown).toEqual(expect.arrayContaining(['Petrol', '−₹500', 'Swiggy', '−₹250']));
    expect(shown).toContain('Save 2 entries');

    await press(renderer, 'Save voice entries');
    const saved = await repository.listTransactions();
    expect(saved).toHaveLength(2);
    expect(saved.map(item => [item.type, item.amountPaise, item.category])).toEqual(
      expect.arrayContaining([['expense', 50000, 'Fuel'], ['expense', 25000, 'Food & Dining']]),
    );
    const petrol = await repository.getById(saved.find(item => item.category === 'Fuel')!.id, 'expense');
    expect(petrol).toMatchObject({ source: 'VOICE', note: 'Petrol' });
    expect(mockCelebrate).toHaveBeenCalledWith({ type: 'expense', category: 'Fuel', amountPaise: 50000, extraCount: 1 });
    expect(onSaved).toHaveBeenCalledWith(2);
    expect(onClose).toHaveBeenCalled();
  });

  it('saves income and lets the user drop or flip a card before saving', async () => {
    const renderer = await open();
    await say('salary aayi 1 lakh aur 300 chai aur 2000 aaye');
    await press(renderer, 'Remove Chai');
    // "2000 aaye" was read as income; flip it to an expense.
    await press(renderer, 'Switch Other to expense');
    await press(renderer, 'Save voice entries');

    const saved = await repository.listTransactions();
    expect(saved.map(item => [item.type, item.amountPaise, item.category]).sort()).toEqual([
      ['expense', 200000, 'Other'],
      ['income', 10000000, 'Salary'],
    ]);
  });

  it('accepts typed text when the mic is not available and points out unclear parts', async () => {
    mockStart.mockImplementationOnce(() => Promise.reject(new Error('Is phone par voice input available nahi hai. Type karke add karo.')));
    const renderer = await open();
    expect(texts(renderer)).toContain('Is phone par voice input available nahi hai. Type karke add karo.');

    const input = renderer.root.findByProps({ accessibilityLabel: 'What you said' });
    await ReactTestRenderer.act(async () => input.props.onChangeText('400 dawai aur lunch bhi'));
    const shown = texts(renderer);
    expect(shown).toContain('−₹400');
    expect(shown).toContain('"lunch bhi" samajh nahi aaya. Amount bhi bolo.');
    expect(shown).toContain('Save entry');
  });

  it('keeps Save disabled until something is understood and stops listening on close', async () => {
    const renderer = await open();
    const save = () => renderer.root.find(node => node.props.accessibilityLabel === 'Save voice entries' && typeof node.props.onPress === 'function');
    expect(save().props.disabled).toBe(true);
    await say('kuch nahi');
    expect(save().props.disabled).toBe(true);

    // The ✕ button (the backdrop shares the label).
    const close = renderer.root.findAll(node => node.props.accessibilityLabel === 'Close voice entry' && node.props.accessibilityRole === 'button');
    await ReactTestRenderer.act(async () => close[0].props.onPress());
    await flush();
    expect(mockStop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(await repository.listTransactions()).toHaveLength(0);
  });
});
