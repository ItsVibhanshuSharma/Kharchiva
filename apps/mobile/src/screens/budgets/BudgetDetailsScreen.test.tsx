import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { BudgetDetailsScreen } from './BudgetDetailsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('BudgetDetailsScreen', () => {
  const renderScreen = (): ReactTestRenderer.ReactTestRenderer => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<BudgetDetailsScreen />);
    });

    if (!renderer) {
      throw new Error('Budget details screen did not render');
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

  it('renders the budget overview, category cards, reflections, and actions', () => {
    const renderer = renderScreen();
    const text = renderedText(renderer);

    expect(text).toContain('Budget Details');
    expect(text).toContain('PLANNING & LIMITS');
    expect(text).toContain('Budget Overview');
    expect(text).toContain('Sep 2026 · 6 days left');
    expect(text).toContain('₹34,800');
    expect(text).toContain('₹40,000');
    expect(text).toContain('₹5,200 remaining');
    expect(text).toContain('87% used');
    expect(text).toContain('₹866/day');
    expect(text).toContain('Category Budgets');
    expect(text).toContain('Food & Dining');
    expect(text).toContain('Shopping & Essentials');
    expect(text).toContain('Travel & Commute');
    expect(text).toContain('Rent & Housing');
    expect(text).toContain('MONTHLY REFLECTION');
    expect(text).toContain('MONTHLY HABIT');
    expect(text).toContain('Adjust Budgets');
    expect(text).toContain('Download Monthly Statement');
  });

  it('keeps the fixed app navigation available without selecting a tab', () => {
    const renderer = renderScreen();
    const navigation = renderer.root.findByType(BottomNavigation);

    expect(navigation.props.items).toEqual([
      { id: 'home', label: 'Home' },
      { id: 'transactions', label: 'Transaction' },
      { id: 'add', label: '+' },
      { id: 'reports', label: 'Report' },
      { id: 'profile', label: 'Profile' },
    ]);
    expect(navigation.props.items.every((item: { active?: boolean }) => !item.active)).toBe(
      true,
    );
  });

  it('uses the shared bottom navigation destinations and back action', () => {
    const renderer = renderScreen();
    const navigation = renderer.root.findByType(BottomNavigation);
    mockNavigate.mockClear();

    ReactTestRenderer.act(() => {
      navigation.props.onSelect('home');
      navigation.props.onSelect('transactions');
      navigation.props.onSelect('add');
      navigation.props.onSelect('reports');
    });

    expect(mockNavigate.mock.calls).toEqual([
      ['Home'],
      ['Transactions'],
      ['AddExpense'],
      ['Reports'],
    ]);

    const backButton = renderer.root.findAll(
      item =>
        item.props.accessibilityLabel === 'Go back' &&
        typeof item.props.onPress === 'function',
    )[0];

    ReactTestRenderer.act(() => {
      backButton.props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

});
