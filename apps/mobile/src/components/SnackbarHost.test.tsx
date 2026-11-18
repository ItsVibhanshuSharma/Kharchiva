import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { showSnackbar } from './snackbar';
import { SnackbarHost } from './SnackbarHost';
import { Text } from './Text';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));

describe('SnackbarHost', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const render = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SnackbarHost />);
    });
    return renderer!;
  };
  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text).map(node => String(node.props.children));

  it('shows a message, then hides it after a few seconds', () => {
    const renderer = render();
    expect(renderer.toJSON()).toBeNull();
    ReactTestRenderer.act(() => showSnackbar({ message: 'Changes save ho gaye' }));
    expect(texts(renderer)).toEqual(['Changes save ho gaye']);
    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(3000);
      jest.runAllTimers();
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('runs the action and closes when it is tapped', () => {
    const onPress = jest.fn();
    const renderer = render();
    ReactTestRenderer.act(() => showSnackbar({ message: 'Saved', action: { label: 'Kholo', onPress } }));
    const action = renderer.root.find(node => node.props.accessibilityLabel === 'Kholo' && typeof node.props.onPress === 'function');
    ReactTestRenderer.act(() => action.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => {
      jest.runAllTimers();
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('replaces an older message with a newer one', () => {
    const renderer = render();
    ReactTestRenderer.act(() => showSnackbar({ message: 'First' }));
    ReactTestRenderer.act(() => showSnackbar({ tone: 'error', message: 'Second' }));
    expect(texts(renderer)).toEqual(['Second']);
  });
});
