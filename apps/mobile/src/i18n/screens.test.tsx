import React from 'react';
import { Text as NativeText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Button } from '../components/Button';
import { AppNavigator } from '../navigation/AppNavigator';
import { setLanguage } from './i18n';
import { LANGUAGES, type LanguageCode } from './languages';
import { ALL_STRINGS } from './strings';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('../database/transactionRepository', () => ({
  getTransactionRepository: () =>
    Promise.resolve({
      listTransactions: () => Promise.resolve([]),
      createExpense: jest.fn(),
      createIncome: jest.fn(),
    }),
}));

const NON_ENGLISH = LANGUAGES.filter(item => item.code !== 'en');

function shownTexts(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(NativeText)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter((child): child is string => typeof child === 'string');
}

describe('screens follow the chosen language', () => {
  afterEach(async () => {
    setLanguage('en');
    await ReactTestRenderer.act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  it.each(
    NON_ENGLISH.map(
      item =>
        [item.englishName, item.code as Exclude<LanguageCode, 'en'>] as const,
    ),
  )('shows the sign-in flow and Home in %s', async (_name, code) => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => setLanguage(code));
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AppNavigator />);
    });
    const press = (label: string) => {
      const button = renderer.root
        .findAllByType(Button)
        .find(item => item.props.children === label);
      expect(button).toBeDefined();
      ReactTestRenderer.act(() => button?.props.onPress?.());
    };

    // Each step must show its heading in the chosen language, and not in English.
    const expectShown = (english: string) => {
      const texts = shownTexts(renderer);
      expect(texts).toContain(ALL_STRINGS[english][code]);
      expect(texts).not.toContain(english);
    };

    expectShown('Your money, made simple.');
    expectShown('Get started');
    press('Get started');
    expectShown('Welcome to Kharchiva');
    press('Send OTP');
    expectShown('Enter 6-digit code');
    press('Verify');
    expectShown("Let's get to know you");
    press('Continue');
    await ReactTestRenderer.act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expectShown('Remaining this month');
    expectShown('Paisa gaya');
  });
});
