import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { AppNavigator } from './AppNavigator';
import { RootStackRouteName } from './types';

describe('App navigator foundation', () => {
  it('registers the expected app screens', () => {
    const routeNames: RootStackRouteName[] = [
      'Welcome',
      'PhoneVerification',
      'OTPVerification',
      'ProfileSetup',
      'Home',
      'Transactions',
      'Reports',
      'BudgetDetails',
      'AddExpense',
      'Recurring',
      'Profile',
      'ExportStatement',
      'OfflineSync',
      'Groups',
      'SplitExpense',
    ];

    expect(routeNames).toEqual([
      'Welcome',
      'PhoneVerification',
      'OTPVerification',
      'ProfileSetup',
      'Home',
      'Transactions',
      'Reports',
      'BudgetDetails',
      'AddExpense',
      'Recurring',
      'Profile',
      'ExportStatement',
      'OfflineSync',
      'Groups',
      'SplitExpense',
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
        .some(text => text.props.children === 'Available balance'),
    ).toBe(true);

    const addExpenseButton = renderer?.root
      .findAllByType(Button)
      .find(button => button.props.children === '+  Add expense');

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
      accessibilityLabel: 'Add expense',
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

  it('opens Reports from the Home bottom navigation', () => {
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

    const reportsTab = renderer?.root.findAll(
      tab =>
        tab.props.accessibilityLabel === 'Reports' &&
        typeof tab.props.onPress === 'function',
    )[0];
    expect(reportsTab).toBeDefined();

    ReactTestRenderer.act(() => {
      reportsTab?.props.onPress?.();
    });

    expect(
      renderer?.root
        .findAllByType(Text)
        .some(text => text.props.children === 'FINANCIAL STORY & INSIGHTS'),
    ).toBe(true);
  });
});
