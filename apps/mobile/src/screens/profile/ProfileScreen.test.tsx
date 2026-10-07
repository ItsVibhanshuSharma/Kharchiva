import React from 'react';
import { Switch } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { ProfileScreen } from './ProfileScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('ProfileScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ProfileScreen />);
    });

    if (!renderer) {
      throw new Error('Profile screen did not render');
    }

    return renderer;
  };

  const textContent = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root
      .findAllByType(Text)
      .map(item => item.props.children)
      .flatMap(child => Array.isArray(child) ? child : [child])
      .filter((child): child is string => typeof child === 'string');

  it('renders the profile details, settings sections and account actions', () => {
    const renderer = renderScreen();
    const text = textContent(renderer);

    expect(text).toContain('Vibhanshu Sharma');
    expect(text).toContain('Member since August 2024');
    expect(text).toContain('MONEY & MANAGEMENT');
    expect(text).toContain('SHARED & COLLABORATION');
    expect(text).toContain('NOTIFICATIONS & REMINDERS');
    expect(text).toContain('DATA PORTABILITY & SECURITY');
    expect(text).toContain('Budgets & Limits');
    expect(text).toContain('Recurring Commitments');
    expect(text).toContain('Delete Account & Wipe Data');
    expect(renderer.root.findByType(BottomNavigation).props.items.at(-1)).toMatchObject({
      id: 'profile',
      label: 'Profile',
      active: true,
    });
  });

  it('navigates from Edit Profile and settings rows', () => {
    const renderer = renderScreen();
    mockNavigate.mockClear();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Edit Profile'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('ProfileSetup');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Budgets & Limits'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('BudgetDetails');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Recurring Commitments'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Recurring');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Export Statement'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('ExportStatement');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Cloud Backup & Sync'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('OfflineSync');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Groups & Split Expenses'}).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Groups');

    const navigation = renderer.root.findByType(BottomNavigation);
    ReactTestRenderer.act(() => navigation.props.onSelect('reports'));
    expect(mockNavigate).toHaveBeenCalledWith('Reports');
  });

  it('toggles local reminder and insight preferences', () => {
    const renderer = renderScreen();
    const reminderSwitch = renderer.root.findAllByType(Switch)[0];
    expect(reminderSwitch.props.value).toBe(true);

    ReactTestRenderer.act(() => reminderSwitch.props.onValueChange(false));

    expect(renderer.root.findAllByType(Switch)[0].props.value).toBe(false);
    expect(renderer.root.findAllByType(Switch)[1].props.value).toBe(true);
  });
});
