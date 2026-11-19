import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './AppErrorBoundary';
import { MpinLockGate } from '../features/mpin/MpinLockGate';
import { AppNavigator } from '../navigation/AppNavigator';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { SnackbarHost } from '../components/SnackbarHost';
import { loadLanguage } from '../i18n/i18n';
import { loadPrivacy } from '../features/privacy/privacy';
import { useForegroundTasks } from './useForegroundTasks';

export function AppRoot() {
  useForegroundTasks();
  useEffect(() => {
    loadPrivacy();
    loadLanguage();
  }, []);
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <MpinLockGate>
          <AppNavigator />
        </MpinLockGate>
        <CelebrationOverlay />
        <SnackbarHost />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}