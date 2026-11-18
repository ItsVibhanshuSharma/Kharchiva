import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { CalendarPicker } from './CalendarPicker';

describe('CalendarPicker minDate', () => {
  const render = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <CalendarPicker maxDate="2026-11-18" minDate="2026-11-09" onClose={jest.fn()} onSelect={jest.fn()} value="2026-11-12" visible />,
      );
    });
    return renderer!;
  };
  const find = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
    renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');

  it('only allows days between minDate and maxDate', () => {
    const renderer = render();
    expect(find(renderer, 'Pick 2026-11-08').props.disabled).toBe(true);
    expect(find(renderer, 'Pick 2026-11-09').props.disabled).toBe(false);
    expect(find(renderer, 'Pick 2026-11-18').props.disabled).toBe(false);
    expect(find(renderer, 'Pick 2026-11-19').props.disabled).toBe(true);
  });

  it('cannot go to months before minDate, in day or month view', () => {
    const renderer = render();
    expect(find(renderer, 'Previous calendar month').props.disabled).toBe(true);
    ReactTestRenderer.act(() => find(renderer, 'Choose month and year').props.onPress());
    expect(find(renderer, 'Choose Oct 2026').props.disabled).toBe(true);
    expect(find(renderer, 'Choose Nov 2026').props.disabled).toBe(false);
    expect(find(renderer, 'Previous calendar year').props.disabled).toBe(true);
  });
});
