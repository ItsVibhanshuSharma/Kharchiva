import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { RecurringScreen } from './RecurringScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn()}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('RecurringScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<RecurringScreen />);
    });

    if (!renderer) {
      throw new Error('Recurring screen did not render');
    }

    return renderer;
  };

  const renderedText = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root
      .findAllByType(Text)
      .map(item => item.props.children)
      .filter((child): child is string => typeof child === 'string');

  const selectTab = (
    renderer: ReactTestRenderer.ReactTestRenderer,
    tab: 'Expenses' | 'Income',
  ) => {
    const tabButton = renderer.root.findByProps({accessibilityLabel: tab});
    ReactTestRenderer.act(() => tabButton.props.onPress());
  };

  it('opens in Expenses state with the existing expense data', () => {
    const renderer = renderScreen();
    const text = renderedText(renderer);

    expect(renderer.root.findByProps({accessibilityLabel: 'Expenses'}).props.accessibilityState.selected).toBe(true);
    expect(text).toContain('₹17,649');
    expect(text).toContain('Netflix');
    expect(text).toContain('Fixed Living Expenses');
    expect(text).toContain('House Rent');
    expect(text).not.toContain('Salary');
    expect(text).not.toContain('Freelance income');
  });

  it('switches to income data and back to expenses', () => {
    const renderer = renderScreen();

    selectTab(renderer, 'Income');
    const incomeText = renderedText(renderer);
    expect(renderer.root.findByProps({accessibilityLabel: 'Income'}).props.accessibilityState.selected).toBe(true);
    expect(incomeText).toContain('₹30,000');
    expect(incomeText).toContain('Salary');
    expect(incomeText).toContain('Freelance income');
    expect(incomeText).not.toContain('Netflix');
    expect(incomeText).not.toContain('House Rent');
    expect(incomeText).not.toContain('Fixed Living Expenses');
    expect(incomeText).not.toContain('Subscriptions');

    selectTab(renderer, 'Expenses');
    const expenseText = renderedText(renderer);
    expect(expenseText).toContain('₹17,649');
    expect(expenseText).toContain('Netflix');
    expect(expenseText).toContain('House Rent');
    expect(expenseText).not.toContain('Salary');
    expect(expenseText).not.toContain('Freelance income');
  });

});
