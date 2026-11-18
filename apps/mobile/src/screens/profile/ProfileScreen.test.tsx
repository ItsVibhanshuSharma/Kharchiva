import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Text } from '../../components/Text';
import { ProfileScreen } from './ProfileScreen';
import { initialsOf } from './profileData';
import { isPrivacyOn, setPrivacyOn } from '../../features/privacy/privacy';

jest.mock('../../database/transactionRepository', () => ({
  getDatabase: () => Promise.resolve({ execute: jest.fn().mockResolvedValue({ rows: [] }) }),
}));

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
const mockNavigate = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockReset }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockReset.mockClear();
  });

  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ProfileScreen />);
    });
    return renderer!;
  };

  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => String(node.props.children));

  const press = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    ReactTestRenderer.act(() => target.props.onPress());
  };

  it('shows only the profile, where data lives, log out and the app version', () => {
    const shown = texts(renderScreen());
    expect(shown).toEqual(expect.arrayContaining(['Profile', 'VS', 'Vibhanshu Sharma', '+91 98765 43210', 'Saved on this phone', 'Statement download', 'Log Out', 'Kharchiva v1.0']));
    // Placeholder settings that did nothing are gone.
    for (const removed of ['Categories & Rules', 'Notification Center', 'App Security & Biometrics', 'Delete Account & Wipe Data', 'Mindful Financial Rhythm']) {
      expect(shown.join(' ')).not.toContain(removed);
    }
  });

  it('opens profile setup and statement, and logs out to the welcome screen', () => {
    const renderer = renderScreen();
    press(renderer, 'Edit Profile');
    expect(mockNavigate).toHaveBeenCalledWith('ProfileSetup');
    press(renderer, 'MPIN');
    expect(mockNavigate).toHaveBeenCalledWith('Mpin');
    press(renderer, 'Statement download');
    expect(mockNavigate).toHaveBeenCalledWith('Statement');
    press(renderer, 'Log Out');
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Welcome' }] });
  });

  it('turns privacy mode on and off from the profile', () => {
    setPrivacyOn(false);
    const renderer = renderScreen();
    const toggle = () => renderer.root.find(node => node.props.accessibilityLabel === 'Privacy mode' && typeof node.props.onValueChange === 'function');
    expect(toggle().props.value).toBe(false);
    ReactTestRenderer.act(() => toggle().props.onValueChange(true));
    expect(isPrivacyOn()).toBe(true);
    expect(toggle().props.value).toBe(true);
    ReactTestRenderer.act(() => toggle().props.onValueChange(false));
    expect(isPrivacyOn()).toBe(false);
  });
  it('keeps the shared bottom navigation', () => {
    const navigation = renderScreen().root.findByType(BottomNavigation);
    expect(navigation.props.items.map((item: { id: string }) => item.id)).toEqual(['home', 'transactions', 'add', 'statement', 'profile']);
    ReactTestRenderer.act(() => navigation.props.onSelect('add'));
    expect(mockNavigate).toHaveBeenCalledWith('AddExpense', { type: 'expense' });
  });

  it('builds initials from the name', () => {
    expect(initialsOf('Vibhanshu Sharma')).toBe('VS');
    expect(initialsOf('asha')).toBe('A');
  });
});
