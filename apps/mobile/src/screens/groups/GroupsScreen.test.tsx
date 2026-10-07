import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from '../../components/Text';
import {GroupsScreen} from './GroupsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('GroupsScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<GroupsScreen />);
    });
    if (!renderer) {
      throw new Error('Groups screen did not render');
    }
    return renderer;
  };

  const visibleText = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(item => item.props.children)
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter((value): value is string => typeof value === 'string');

  it('renders group balances, groups, shared activity and invitation section', () => {
    const renderer = renderScreen();
    const text = visibleText(renderer);
    expect(text).toContain('SHARED HUB');
    expect(text).toContain('OVERALL GROUP STANDING');
    expect(text).toContain('₹400');
    expect(text).toContain('Goa Beach Retreat');
    expect(text).toContain('Indiranagar Flatmates');
    expect(text).toContain('Recent Activity');
    expect(text).toContain('Invited by someone?');
    expect(text).toContain('Add Shared Expense');
  });

  it('shows local feedback for settlement and ledger actions', () => {
    const renderer = renderScreen();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Settle Balances'}).props.onPress());
    expect(visibleText(renderer)).toContain('Settlement summary ready');

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'View Goa Beach Retreat split ledger'}).props.onPress());
    expect(visibleText(renderer)).toContain('Goa Beach Retreat split ledger opened');

  });

  it('opens Split Expense from the Add Shared Expense button', () => {
    const renderer = renderScreen();
    mockNavigate.mockClear();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Add Shared Expense'}).props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('SplitExpense');
  });

  it('opens Profile from the header action', () => {
    const renderer = renderScreen();
    mockNavigate.mockClear();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Open Profile'}).props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });
});
