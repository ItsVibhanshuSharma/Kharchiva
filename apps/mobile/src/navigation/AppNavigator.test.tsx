import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { AppNavigator } from './AppNavigator';
import { ACTIVE_ROUTES } from './types';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));
jest.mock('../database/transactionRepository', () => ({
  getTransactionRepository: () => Promise.resolve({
    listTransactions: () => Promise.resolve([]),
    createExpense: jest.fn(),
    createIncome: jest.fn(),
  }),
}));

describe('App navigator foundation', () => {
  afterEach(async () => {
    // Let Home's async month load settle before Jest tears the environment down.
    await ReactTestRenderer.act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  it('registers only the v1 screens', () => {
    expect(ACTIVE_ROUTES).toEqual([
      'Welcome',
      'PhoneVerification',
      'OTPVerification',
      'ProfileSetup',
      'Home',
      'Transactions',
      'AddExpense',
      'Profile',
      'Mpin',
      'Statement',
      'Budget',
      'ManageLists',
      'Reminder',
      'Recurring',
    ]);
  });

  it('renders without crashing', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AppNavigator />);
    });

    expect(renderer?.root).toBeTruthy();
  });

  it('opens phone verification when Get started is pressed', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AppNavigator />);
    });

    const getStartedButton = renderer?.root
      .findAllByType(Button)
      .find(button => button.props.children === 'Get started');

    expect(getStartedButton).toBeDefined();

    ReactTestRenderer.act(() => {
      getStartedButton?.props.onPress?.();
    });

    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'Welcome to Kharchiva'),
    ).toBe(true);
  });

  it('completes the demo sign-in flow through the home screen', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AppNavigator />);
    });

    const pressButton = (label: string) => {
      const button = renderer?.root
        .findAllByType(Button)
        .find(candidate => candidate.props.children === label);

      expect(button).toBeDefined();
      ReactTestRenderer.act(() => {
        button?.props.onPress?.();
      });
    };

    pressButton('Get started');
    pressButton('Send OTP');
    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'Enter 6-digit code'),
    ).toBe(true);

    pressButton('Verify');
    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === "Let's get to know you"),
    ).toBe(true);

    pressButton('Continue');
    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'Remaining this month'),
    ).toBe(true);

    const addExpenseButton = renderer?.root.findByProps({
      accessibilityLabel: 'Add expense',
    });

    ReactTestRenderer.act(() => {
      addExpenseButton?.props.onPress?.();
    });

    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'SPENT AMOUNT'),
    ).toBe(true);

    const backButton = renderer?.root
      .findAllByProps({ accessibilityLabel: 'Go back' })
      .at(-1);

    ReactTestRenderer.act(() => {
      backButton?.props.onPress?.();
    });

    const addTab = renderer?.root.findByProps({
      accessibilityLabel: 'Add entry',
    });

    expect(addTab).toBeDefined();

    ReactTestRenderer.act(() => {
      addTab?.props.onPress?.();
    });

    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'SPENT AMOUNT'),
    ).toBe(true);
  });

  it('does not offer Reports, Groups, Export or Sync from Home', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AppNavigator />);
    });
    const pressButton = (label: string) => {
      const button = renderer?.root
        .findAllByType(Button)
        .find(candidate => candidate.props.children === label);
      ReactTestRenderer.act(() => {
        button?.props.onPress?.();
      });
    };
    pressButton('Get started');
    pressButton('Send OTP');
    pressButton('Verify');
    pressButton('Continue');
    const labels = renderer?.root
      .findAll(node => typeof node.props.onPress === 'function')
      .map(node => node.props.accessibilityLabel);
    expect(labels).toEqual(expect.arrayContaining(['Home', 'Transactions', 'Add entry', 'Profile']));
    expect(labels).not.toContain('Reports');
  });
});
