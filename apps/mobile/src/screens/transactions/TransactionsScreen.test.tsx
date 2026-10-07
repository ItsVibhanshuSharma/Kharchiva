import React from 'react';
import {
  BackHandler,
  Keyboard,
  type KeyboardEvent,
} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { TransactionsScreen } from './TransactionsScreen';
import { formatTransactionCount } from './transactionUtils';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('TransactionsScreen', () => {
  const renderScreen = (): ReactTestRenderer.ReactTestRenderer => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TransactionsScreen />);
    });

    if (!renderer) {
      throw new Error('Transactions screen did not render');
    }

    return renderer;
  };

  const renderedText = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root
      .findAllByType(Text)
      .map(item => {
        const parts = Array.isArray(item.props.children)
          ? item.props.children
          : [item.props.children];
        return parts
          .filter(
            (part): part is string | number =>
              typeof part === 'string' || typeof part === 'number',
          )
          .join('');
      })
      .join(' ');

  it('opens Reports from the bottom tab', () => {
    const renderer = renderScreen();
    const navigation = renderer.root.findByType(BottomNavigation);
    mockNavigate.mockClear();

    ReactTestRenderer.act(() => navigation.props.onSelect?.('reports'));

    expect(mockNavigate).toHaveBeenCalledWith('Reports');
  });


  it('renders the local transaction summary and sample rows', () => {
    const renderer = renderScreen();

    const text = renderedText(renderer);
    expect(text).toContain('8 transactions');
    expect(text).toContain('Supermarket Groceries');
    expect(text).toContain('Salary');
  });

  it.each([
    [0, '0 transactions'],
    [1, '1 transaction'],
    [2, '2 transactions'],
    [8, '8 transactions'],
  ])('formats a count of %i', (count, expected) => {
    expect(formatTransactionCount(count)).toBe(expected);
  });

  it('filters the transaction list by type', () => {
    const renderer = renderScreen();

    const expensesFilter = renderer?.root.findAll(
      item =>
        item.props.accessibilityLabel === 'Expenses' &&
        typeof item.props.onPress === 'function',
    )[0];
    expect(expensesFilter).toBeDefined();

    ReactTestRenderer.act(() => {
      expensesFilter?.props.onPress?.();
    });

    const text = renderedText(renderer);
    expect(text).toContain('6 transactions');
    expect(text).not.toContain('Salary');
  });

  it('shows singular counts for a matching search and zero counts for no results', () => {
    const renderer = renderScreen();
    const searchInput = renderer.root.find(
      item =>
        item.props.accessibilityLabel === 'Search transactions' &&
        typeof item.props.onChangeText === 'function',
    );

    ReactTestRenderer.act(() => {
      searchInput.props.onChangeText('salary');
    });

    expect(renderedText(renderer)).toContain('1 transaction');
    expect(renderedText(renderer)).toContain('Salary');

    ReactTestRenderer.act(() => {
      searchInput.props.onChangeText('not found');
    });

    expect(renderedText(renderer)).toContain('0 transactions');
    expect(renderedText(renderer)).toContain('No transactions found');
  });

  it('hides bottom navigation while the keyboard is open and restores it on dismissal', () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const addListener = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((eventName, listener) => {
        listeners.set(eventName, listener);
        return { remove: jest.fn() };
      });
    let onHardwareBack:
      | ((event: { readonly type: string; readonly timeStamp: number }) =>
          boolean | undefined)
      | undefined;
    const addBackListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, listener) => {
        onHardwareBack = listener;
        return { remove: jest.fn() };
      });
    const dismissKeyboard = jest
      .spyOn(Keyboard, 'dismiss')
      .mockImplementation(jest.fn());
    const renderer = renderScreen();

    expect(renderedText(renderer)).toContain('Report');

    ReactTestRenderer.act(() => {
      listeners.get('keyboardDidShow')?.({
        duration: 0,
        easing: 'keyboard',
        endCoordinates: { screenX: 0, screenY: 0, width: 0, height: 0 },
      });
    });
    expect(renderedText(renderer)).not.toContain('Reports');

    let backHandled = false;
    ReactTestRenderer.act(() => {
      backHandled =
        onHardwareBack?.({
          type: 'hardwareBackPress',
          timeStamp: Date.now(),
        }) ?? false;
    });
    expect(backHandled).toBe(true);
    expect(dismissKeyboard).toHaveBeenCalledTimes(1);
    expect(renderedText(renderer)).not.toContain('Reports');

    ReactTestRenderer.act(() => {
      listeners.get('keyboardDidHide')?.({
        duration: 0,
        easing: 'keyboard',
        endCoordinates: { screenX: 0, screenY: 0, width: 0, height: 0 },
      });
    });
    expect(renderedText(renderer)).toContain('Report');

    addListener.mockRestore();
    addBackListener.mockRestore();
    dismissKeyboard.mockRestore();
  });
});
