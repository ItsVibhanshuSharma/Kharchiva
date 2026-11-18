import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncNothingDaysFromNotification } from '../features/reminder/reminder';

/** Work that should happen whenever the app opens or comes back to the foreground. */
async function runForegroundTasks() {
  // Each task guards itself; one failing must not stop the others or the app.
  await syncNothingDaysFromNotification().catch(() => undefined);
}

export function useForegroundTasks() {
  useEffect(() => {
    runForegroundTasks();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') runForegroundTasks();
    });
    return () => subscription.remove();
  }, []);
}
