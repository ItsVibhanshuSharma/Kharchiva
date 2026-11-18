import { useEffect, useSyncExternalStore } from 'react';
import { getMpinStore } from './getMpinStore';
let enabled = false;
const listeners = new Set<() => void>();
export function setMpinEnabled(next: boolean) {
  if (next === enabled) return;
  enabled = next;
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** Whether an MPIN is set. Reads the saved state once when first used. */
export function useMpinEnabled(): boolean {
  useEffect(() => {
    getMpinStore()
      .then(store => store.isSet())
      .then(setMpinEnabled)
      .catch(() => undefined);
  }, []);
  return useSyncExternalStore(subscribe, () => enabled, () => enabled);
}
