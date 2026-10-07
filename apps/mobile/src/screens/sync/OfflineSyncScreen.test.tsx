import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Switch} from 'react-native';
import {Text} from '../../components/Text';
import {OfflineSyncScreen} from './OfflineSyncScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('OfflineSyncScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<OfflineSyncScreen />);
    });
    if (!renderer) {
      throw new Error('Offline and sync screen did not render');
    }
    return renderer;
  };

  const flattenText = (node: unknown): string[] => {
    if (typeof node === 'string') {
      return [node];
    }
    if (Array.isArray(node)) {
      return node.flatMap(flattenText);
    }
    if (node && typeof node === 'object' && 'props' in node) {
      return flattenText((node as {props: {children?: unknown}}).props.children);
    }
    return [];
  };

  const textContent = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).flatMap(item => flattenText(item.props.children));

  it('renders sync preview, reconciliation options, offline controls and preview information', () => {
    const renderer = renderScreen();
    const text = textContent(renderer);
    expect(text).toContain('Sync Preview');
    expect(text).toContain('Sample ledger status');
    expect(text).toContain('Gentle Reconciliation');
    expect(text).toContain('Keep Local Version (₹450)');
    expect(text).toContain('Keep Cloud Version (₹500)');
    expect(text).toContain('Offline Resilience');
    expect(text).toContain('PREVIEW MODE');
  });

  it('supports mock retry, reconciliation choice, integrity check and profile navigation', () => {
    const renderer = renderScreen();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Retry Sync Preview'}).props.onPress());
    expect(textContent(renderer)).toContain('Sync queued · Waiting for confirmation');

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Keep Cloud Version (₹500)'}).props.onPress());
    expect(textContent(renderer)).toContain('Selected Cloud Version');

    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Run Database Integrity Preview'}).props.onPress());
    expect(textContent(renderer)).toContain('Preview complete · no database was checked');

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Open Profile'}).props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('toggles cellular auto-sync locally', () => {
    const renderer = renderScreen();
    const switchControl = renderer.root.findByType(Switch);
    expect(switchControl.props.value).toBe(true);
    ReactTestRenderer.act(() => switchControl.props.onValueChange(false));
    expect(renderer.root.findByType(Switch).props.value).toBe(false);
  });
});
