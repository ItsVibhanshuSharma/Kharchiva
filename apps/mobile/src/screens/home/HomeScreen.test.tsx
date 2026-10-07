import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { HomeScreen } from './HomeScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('HomeScreen', () => {
  it('opens Profile from the header action', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    if (!renderer) {
      throw new Error('Home screen did not render');
    }

    const profileButton = renderer.root.find(
      item =>
        item.props.accessibilityLabel === 'Open Profile' &&
        typeof item.props.onPress === 'function',
    );

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      profileButton.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('opens Budget Details from the Monthly overview card', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    if (!renderer) {
      throw new Error('Home screen did not render');
    }

    const budgetLink = renderer.root.find(
      item =>
        item.props.accessibilityLabel === 'Open Budget Details' &&
        typeof item.props.onPress === 'function',
    );

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      budgetLink.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('BudgetDetails');
  });

  it('opens Recurring from the home shortcut', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    const recurringLink = renderer?.root.find(
      item =>
        item.props.accessibilityLabel === 'Open Recurring' &&
        typeof item.props.onPress === 'function',
    );
    mockNavigate.mockClear();

    ReactTestRenderer.act(() => {
      recurringLink?.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('Recurring');
  });
});
