import { useEffect } from 'react';
import { AppState } from 'react-native';
import { showSnackbar } from '../components/snackbar';
import { processRecurring, type AutoAdded } from '../features/recurring/runRecurring';
import { syncNothingDaysFromNotification } from '../features/reminder/reminder';
import { formatRupees } from '../utils/money';

export function autoAddedMessage(added: AutoAdded[]): string | null {
  if (added.length === 0) return null;
  if (added.length === 1) {
    const [item] = added;
    return `${item.name} ${item.kind === 'income' ? '+' : '−'}${formatRupees(item.amountPaise)} apne aap jud gaya`;
  }
  return `${added.length} recurring entries apne aap jud gayi`;
}

/** Work that should happen whenever the app opens or comes back to the foreground. */
async function runForegroundTasks() {
  // Each task guards itself; one failing must not stop the others or the app.
  await syncNothingDaysFromNotification().catch(() => undefined);
  const added = await processRecurring().catch(() => [] as AutoAdded[]);
  const message = autoAddedMessage(added);
  if (message) showSnackbar({ message });
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
