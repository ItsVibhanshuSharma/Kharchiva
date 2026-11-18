import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { CelebrationOverlay } from './CelebrationOverlay';
import { celebrate } from './celebration';
import { Text } from './Text';

describe('CelebrationOverlay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAllByType(Text).map(node => String(node.props.children));

  it('shows a happy card for income and a gentle one for expenses, then hides', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<CelebrationOverlay />);
    });
    expect(renderer!.toJSON()).toBeNull();

    ReactTestRenderer.act(() => celebrate({ type: 'income', category: 'Salary', amountPaise: 100000_00 }));
    expect(texts(renderer!)).toEqual(expect.arrayContaining(['+₹1,00,000 added', 'Salary · Paisa aaya! 🎉']));
    // Overlay must not block taps on the screen below.
    expect(renderer!.root.findByProps({ testID: 'celebration-overlay' }).props.pointerEvents).toBe('none');

    ReactTestRenderer.act(() => celebrate({ type: 'expense', category: 'Food & Dining', amountPaise: 500_00 }));
    expect(texts(renderer!)).toEqual(expect.arrayContaining(['−₹500 spent', 'Food & Dining · Paisa gaya 🥲']));

    ReactTestRenderer.act(() => {
      jest.runAllTimers();
    });
    expect(renderer!.toJSON()).toBeNull();
  });
});
