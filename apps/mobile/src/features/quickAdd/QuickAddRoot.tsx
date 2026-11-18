import React from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '../../app/AppErrorBoundary';
import { VoiceEntrySheet } from '../voice/VoiceEntrySheet';
import { QuickAddScreen } from './QuickAddScreen';

export type QuickAddMode = 'expense' | 'income' | 'voice';

/** Launch props come from QuickAddActivity (Android) via the intent's "mode" extra. */
export type QuickAddRootProps = { mode?: string };

/**
 * Root of the quick-add window, registered as its own app component so it can open
 * over other apps without starting the full Kharchiva UI.
 */
export function QuickAddRoot({ mode }: QuickAddRootProps) {
  const resolved: QuickAddMode = mode === 'income' || mode === 'voice' ? mode : 'expense';
  // Back/exit finishes this activity only; the main app is left as it was.
  const close = () => BackHandler.exitApp();

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        {resolved === 'voice' ? (
          <VoiceEntrySheet onClose={close} onSaved={() => undefined} visible />
        ) : (
          <QuickAddScreen initialType={resolved} onClose={close} />
        )}
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
