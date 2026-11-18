import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeToEntryChanges } from '../entries/entryEvents';
import type { SmsDraft } from './parseBankSms';
import { hasSmsPermission, isSmsDetectionAvailable, loadSmsDrafts } from './smsInbox';

/** Pending SMS drafts and permission state; refreshes when the app returns to the foreground. */
export function useSmsDrafts() {
  const [drafts, setDrafts] = useState<SmsDraft[]>([]);
  const [permitted, setPermitted] = useState(false);
  const available = isSmsDetectionAvailable();

  const refresh = useCallback(async () => {
    if (!available) return;
    try {
      const allowed = await hasSmsPermission();
      setPermitted(allowed);
      setDrafts(allowed ? await loadSmsDrafts() : []);
    } catch {
      setDrafts([]);
    }
  }, [available]);

  useEffect(() => {
    refresh();
    const appState = AppState.addEventListener('change', state => state === 'active' && refresh());
    const entries = subscribeToEntryChanges(refresh);
    return () => {
      appState.remove();
      entries();
    };
  }, [refresh]);

  return { available, permitted, drafts, refresh };
}
