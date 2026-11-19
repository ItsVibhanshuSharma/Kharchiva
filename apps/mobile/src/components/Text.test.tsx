import React from 'react';
import { Text as NativeText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { setLanguage } from '../i18n/i18n';
import { Text } from './Text';

describe('Text translation', () => {
  afterEach(() => setLanguage('en'));

  it('shows plain strings in the chosen language and switches live', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Text>Profile</Text>);
    });
    expect(renderer.root.findByType(NativeText).props.children).toBe('Profile');
    ReactTestRenderer.act(() => setLanguage('hi'));
    expect(renderer.root.findByType(NativeText).props.children).toBe('प्रोफ़ाइल');
  });

  it('leaves text without a translation as it is', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => setLanguage('ta'));
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Text>₹1,200</Text>);
    });
    expect(renderer.root.findByType(NativeText).props.children).toBe('₹1,200');
  });
});
