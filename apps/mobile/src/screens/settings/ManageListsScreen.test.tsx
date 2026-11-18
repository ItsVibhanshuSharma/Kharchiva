import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { initializeDatabase } from '../../database/initialize';
import { SQLiteCatalogRepository } from '../../database/repositories/CatalogRepository';
import { InMemoryFinancialDatabase } from '../../database/testing/InMemoryFinancialDatabase';
import { getCatalog, loadCatalog, resetCatalogForTests } from '../../features/catalog/catalogStore';
import { ManageListsScreen } from './ManageListsScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
const mockCatalog = jest.fn<Promise<SQLiteCatalogRepository>, []>();
jest.mock('../../database/catalogRepository', () => ({ getCatalogRepository: () => mockCatalog() }));
jest.mock('../../components/snackbar', () => ({ showSnackbar: jest.fn() }));

describe('ManageListsScreen', () => {
  beforeEach(async () => {
    resetCatalogForTests();
    const database = new InMemoryFinancialDatabase();
    await initializeDatabase(database);
    let ids = 0;
    mockCatalog.mockReset().mockResolvedValue(new SQLiteCatalogRepository(database, { idFactory: () => `m-${++ids}` }));
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
      renderer = ReactTestRenderer.create(<ManageListsScreen />);
    });
    return renderer!;
  };
  const press = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    await ReactTestRenderer.act(async () => {
      target.props.onPress();
    });
    await flush();
  };
  const type = async (renderer: ReactTestRenderer.ReactTestRenderer, value: string) => {
    const input = renderer.root.findByProps({ accessibilityLabel: 'New name' });
    await ReactTestRenderer.act(async () => input.props.onChangeText(value));
  };
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text).map(node => String(node.props.children));

  it('adds a category with an emoji and a payment source', async () => {
    const renderer = await render();
    await press(renderer, 'Add expense category');
    await type(renderer, 'Gym');
    await press(renderer, 'Emoji 🏋️');
    await press(renderer, 'Save new item');
    expect(getCatalog().customCategories).toEqual([expect.objectContaining({ name: 'Gym', type: 'expense', emoji: '🏋️' })]);
    expect(texts(renderer)).toContain('Gym');

    await press(renderer, 'Add payment source');
    await type(renderer, 'HDFC Credit Card');
    await press(renderer, 'Save new item');
    expect(getCatalog().paymentSources.map(item => item.name)).toEqual(['HDFC Credit Card']);
  });

  it('keeps the sheet open with a message for a duplicate name', async () => {
    const renderer = await render();
    await press(renderer, 'Add expense category');
    await type(renderer, 'groceries');
    await press(renderer, 'Save new item');
    expect(texts(renderer)).toContain('"groceries" pehle se hai.');
    expect(getCatalog().customCategories).toEqual([]);
  });

  it('removes an item after confirmation', async () => {
    const repository = await mockCatalog();
    await repository.addPaymentSource('Paytm Wallet');
    await loadCatalog(true);
    const renderer = await render();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find(button => button.text === 'Hatao')?.onPress?.();
    });
    await press(renderer, 'Remove Paytm Wallet');
    await flush();
    expect(getCatalog().paymentSources).toEqual([]);
    alert.mockRestore();
  });
});
