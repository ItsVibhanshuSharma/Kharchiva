import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { WelcomeScreen } from './auth/WelcomeScreen';
import { PhoneVerificationScreen } from './auth/PhoneVerificationScreen';
import { OTPVerificationScreen } from './auth/OTPVerificationScreen';
import { ProfileSetupScreen } from './auth/ProfileSetupScreen';
import { HomeScreen } from './home/HomeScreen';
import { AddExpenseScreen } from './expenses/AddExpenseScreen';

describe('Phase 1 UI screens', () => {
  test.each([
    ['Welcome', <WelcomeScreen key="welcome" />],
    ['Phone verification', <PhoneVerificationScreen key="phone" />],
    ['OTP verification', <OTPVerificationScreen key="otp" />],
    ['Profile setup', <ProfileSetupScreen key="profile" />],
    ['Home', <HomeScreen key="home" />],
    ['Add expense', <AddExpenseScreen key="expense" />],
  ])('renders %s', (_label, screen) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider>{screen}</SafeAreaProvider>,
      );
    });

    expect(renderer?.root).toBeTruthy();
  });
});
