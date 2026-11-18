import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from '../../components/Text';
import {GroupsScreen} from './GroupsScreen';
import {SplitExpenseScreen} from './SplitExpenseScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('SplitExpenseScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SplitExpenseScreen />);
    });
    if (!renderer) {
      throw new Error('Split Expense screen did not render');
    }
    return renderer;
  };

  const visibleText = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(item => item.props.children)
      .flat(Infinity)
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .map(String)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  const press = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: label}).props.onPress();
    });
  };

  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  it('renders the details, group, default equal split, participants, notes, and fixed CTA', () => {
    const renderer = renderScreen();
    const text = visibleText(renderer);
    expect(text).toContain('Split Expense');
    expect(text).toContain('Expense Details');
    expect(renderer.root.findByProps({accessibilityLabel: 'Expense description'}).props.value).toBe('Dinner at Fisherman’s Wharf');
    expect(text).toContain('Goa Beach Retreat');
    expect(text).toContain('Rahul (You)');
    expect(text).toContain('Equal Split');
    expect(text).toContain('Vibhu');
    expect(text).toContain('Aditi');
    expect(text).toContain('Priya');
    expect(text).toContain('Create Split Expense');
    expect(renderer.root.findByProps({accessibilityLabel: 'Expense amount'}).props.value).toBe('2,400');
  });

  it('shows required-field feedback and blocks an invalid split preview', () => {
    const renderer = renderScreen();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Expense description'}).props.onChangeText('');
      renderer.root.findByProps({accessibilityLabel: 'Expense amount'}).props.onChangeText('0');
    });
    press(renderer, 'Create Split Expense');
    expect(visibleText(renderer)).toContain('Review the highlighted fields before creating this split.');
    expect(visibleText(renderer)).not.toContain('Preview created locally. Nothing was sent to a server.');
  });

  it('switches between the three split modes', () => {
    const renderer = renderScreen();
    press(renderer, 'Exact Amount');
    expect(renderer.root.findByProps({accessibilityLabel: 'Exact Amount'}).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findByProps({accessibilityLabel: 'Rahul exact amount'})).toBeTruthy();

    press(renderer, 'Custom %');
    expect(renderer.root.findByProps({accessibilityLabel: 'Custom %'}).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findByProps({accessibilityLabel: 'Rahul percentage'})).toBeTruthy();
  });

  it('recalculates equal shares when amount or participant count changes', () => {
    const renderer = renderScreen();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Expense amount'}).props.onChangeText('3200');
    });
    expect(visibleText(renderer)).toContain('₹800');

    press(renderer, 'Remove Priya');
    expect(renderer.root.findAllByType(Text).filter(item => item.props.children === '₹1,066.67')).toHaveLength(2);
    expect(renderer.root.findAllByType(Text).filter(item => item.props.children === '₹1,066.66')).toHaveLength(1);
  });

  it('adds a group member and an outside participant, and removes participants', () => {
    const renderer = renderScreen();
    press(renderer, 'Add from Group');
    press(renderer, 'Add Neha');
    expect(renderer.root.findAllByType(Text).filter(item => item.props.children === '₹480')).toHaveLength(5);

    press(renderer, 'Add Participant');
    press(renderer, 'Add Meera');
    expect(renderer.root.findAllByType(Text).filter(item => item.props.children === '₹400')).toHaveLength(6);
    press(renderer, 'Remove Meera');
    expect(renderer.root.findAllByType(Text).filter(item => item.props.children === '₹480')).toHaveLength(5);
  });

  it('validates and reconciles exact participant amounts', () => {
    const renderer = renderScreen();
    press(renderer, 'Exact Amount');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Rahul exact amount'}).props.onChangeText('300');
    });
    expect(visibleText(renderer)).toContain('₹300 unallocated');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Rahul exact amount'}).props.onChangeText('900');
      renderer.root.findByProps({accessibilityLabel: 'Vibhu exact amount'}).props.onChangeText('500');
      renderer.root.findByProps({accessibilityLabel: 'Aditi exact amount'}).props.onChangeText('500');
      renderer.root.findByProps({accessibilityLabel: 'Priya exact amount'}).props.onChangeText('500');
    });
    expect(visibleText(renderer)).toContain('₹2,400 allocated · Exact amounts match the total.');
    press(renderer, 'Create Split Expense');
    expect(visibleText(renderer)).toContain('Preview created locally. Nothing was sent to a server.');
  });

  it('shows the remaining percentage and accepts exactly 100 percent', () => {
    const renderer = renderScreen();
    press(renderer, 'Custom %');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Rahul percentage'}).props.onChangeText('40');
      renderer.root.findByProps({accessibilityLabel: 'Vibhu percentage'}).props.onChangeText('20');
      renderer.root.findByProps({accessibilityLabel: 'Aditi percentage'}).props.onChangeText('20');
      renderer.root.findByProps({accessibilityLabel: 'Priya percentage'}).props.onChangeText('10');
    });
    expect(visibleText(renderer)).toContain('10.00% remaining');

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Priya percentage'}).props.onChangeText('20');
    });
    expect(visibleText(renderer)).toContain('100.00% assigned · Percentages add up to 100%.');
    press(renderer, 'Create Split Expense');
    expect(visibleText(renderer)).toContain('Preview created locally. Nothing was sent to a server.');
  });

  it('limits notes to 200 characters and updates the counter', () => {
    const renderer = renderScreen();
    const note = renderer.root.findByProps({accessibilityLabel: 'Notes'});
    expect(note.props.maxLength).toBe(200);
    ReactTestRenderer.act(() => note.props.onChangeText('a'.repeat(240)));
    expect(renderer.root.findByProps({accessibilityLabel: 'Notes'}).props.value).toHaveLength(200);
    expect(visibleText(renderer)).toContain('200/200');
  });

  it('opens date and group selectors and supports back and profile navigation', () => {
    const renderer = renderScreen();
    press(renderer, 'Choose date');
    press(renderer, '11 Sep 2026');
    expect(visibleText(renderer)).toContain('11 Sep 2026');

    press(renderer, 'Choose group');
    press(renderer, 'Indiranagar Flatmates');
    expect(visibleText(renderer)).toContain('Indiranagar Flatmates');

    press(renderer, 'Go back');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    press(renderer, 'Open Profile');
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('opens Split Expense from Groups and returns through the back action', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<GroupsScreen />);
    });
    if (!renderer) {
      throw new Error('Groups screen did not render');
    }
    press(renderer, 'Add Shared Expense');
    expect(mockNavigate).toHaveBeenCalledWith('SplitExpense');
    press(renderer, 'Go back');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
