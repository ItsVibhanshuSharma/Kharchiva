import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from '../../components/Text';
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

  const textContent = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(item => item.props.children)
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter((value): value is string => typeof value === 'string');

  it('renders the sample dinner split, participants, group, and confirmation action', () => {
    const renderer = renderScreen();
    const text = textContent(renderer);
    expect(text).toContain('Split Expense');
    expect(text).toContain('Goa Retreat');
    expect(text).toContain('Food & Dining');
    expect(renderer.root.findByProps({accessibilityLabel: 'Expense title'}).props.value).toBe('Dinner at Fisherman’s Wharf');
    expect(text.join(' ')).toContain('₹600 each = ₹2,400 total');
    expect(text).toContain('Rahul Verma');
    expect(text).toContain('Aman Gupta');
    expect(text).toContain('Priya Nair');
    expect(renderer.root.findByProps({accessibilityLabel: 'Confirm Split'})).toBeTruthy();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Confirm Split'}).props.onPress());
    expect(textContent(renderer)).toContain('Split Confirmed ✓');
  });

  it('updates shares from the amount, participant, and split method controls', () => {
    const renderer = renderScreen();
    const amountField = renderer.root.findByProps({accessibilityLabel: 'Expense amount'});
    ReactTestRenderer.act(() => amountField.props.onChangeText('3200'));
    expect(textContent(renderer).join(' ')).toContain('₹800 each = ₹3,200 total');

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Include Priya Nair'}).props.onPress());
    expect(textContent(renderer).join(' ')).toContain('3 participants');
    expect(Object.values(renderer.root.findByProps({accessibilityLabel: 'Confirm Split'}).props.accessibilityState)).toContain(false);

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Exact (₹)'}).props.onPress());
    const exactField = renderer.root.findByProps({accessibilityLabel: 'Vibhanshu Sharma exact share'});
    ReactTestRenderer.act(() => exactField.props.onChangeText('900'));
    expect(textContent(renderer).join(' ')).toContain('Adjust shares to match');
  });

  it('allows editing the title and note, saves locally, and returns with the back action', () => {
    const renderer = renderScreen();
    const titleField = renderer.root.findByProps({accessibilityLabel: 'Expense title'});
    ReactTestRenderer.act(() => titleField.props.onChangeText('Lunch bill'));
    const noteEdit = renderer.root.findByProps({accessibilityLabel: 'Edit note'});
    ReactTestRenderer.act(() => noteEdit.props.onPress());
    expect(renderer.root.findByProps({accessibilityLabel: 'Split note'})).toBeTruthy();

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Save Split'}).props.onPress());
    expect(renderer.root.findByProps({accessibilityLabel: 'Split saved'})).toBeTruthy();

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Go back'}).props.onPress());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
