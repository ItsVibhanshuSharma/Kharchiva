import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { ReportsScreen } from './ReportsScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('ReportsScreen', () => {
  const renderScreen = (): ReactTestRenderer.ReactTestRenderer => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ReportsScreen />);
    });

    if (!renderer) {
      throw new Error('Reports screen did not render');
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

  it('renders the report summary, category breakdown, channels, and actions', () => {
    const renderer = renderScreen();
    const text = renderedText(renderer);

    expect(text).toContain('FINANCIAL STORY & INSIGHTS');
    expect(text).toContain('SPENT THIS MONTH');
    expect(text).toContain('₹80,000');
    expect(text).toContain('₹41,000');
    expect(text).toContain('Where your money went');
    expect(text).toContain('Rent & Housing');
    expect(text).toContain('Food & Dining');
    expect(text).toContain('Shopping');
    expect(text).toContain('Travel & Fuel');
    expect(text).toContain('Bills & Utilities');
    expect(text).toContain('May');
    expect(text).toContain('Jun');
    expect(text).toContain('Jul');
    expect(text).toContain('Aug');
    expect(text).toContain('Sep');
    expect(text).toContain('Oct');
    expect(text).toContain('Payment Channels');
    expect(text).toContain('UPI');
    expect(text).toContain('58%');
    expect(text).toContain('Card');
    expect(text).toContain('27%');
    expect(text).toContain('Cash');
    expect(text).toContain('15%');
    expect(text).toContain('View Monthly Comparison');
    expect(text).toContain('Export Statement (CSV / PDF)');
  });

  it('selects report periods and keeps Reports selected in bottom navigation', () => {
    const renderer = renderScreen();
    const lastMonthChip = renderer.root.findAll(
      item =>
        item.props.accessibilityLabel === 'Last month' &&
        typeof item.props.onPress === 'function',
    )[0];

    expect(lastMonthChip).toBeDefined();
    ReactTestRenderer.act(() => {
      lastMonthChip.props.onPress();
    });
    expect(lastMonthChip.props.accessibilityState.selected).toBe(true);

    const navigation = renderer.root.findByType(BottomNavigation);
    expect(
      navigation.props.items.find(
        (item: { id: string }) => item.id === 'reports',
      ).active,
    ).toBe(true);
  });

  it('keeps the Home, Transactions, and add navigation controls available', () => {
    const renderer = renderScreen();
    const labels = renderer.root
      .findAll(
        item =>
          typeof item.props.accessibilityLabel === 'string' &&
          typeof item.props.onPress === 'function',
      )
      .map(item => item.props.accessibilityLabel);

    expect(labels).toEqual(
      expect.arrayContaining(['Home', 'Transactions', 'Add expense']),
    );
  });

  it('routes bottom navigation selections without implementing Reports actions', () => {
    const renderer = renderScreen();
    const navigation = renderer.root.findByType(BottomNavigation);
    mockNavigate.mockClear();

    ReactTestRenderer.act(() => {
      navigation.props.onSelect('home');
      navigation.props.onSelect('transactions');
      navigation.props.onSelect('add');
    });

    expect(mockNavigate.mock.calls).toEqual([
      ['Home'],
      ['Transactions'],
      ['AddExpense'],
    ]);
    expect(mockNavigate).not.toHaveBeenCalledWith('Reports');
  });

});
