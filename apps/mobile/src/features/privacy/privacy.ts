import { useSyncExternalStore } from 'react';

/** What replaces every money value while privacy mode is on. */
export const HIDDEN_AMOUNT = '--';

// Loaded on first use so screens that only read the flag do not pull in SQLite.
const getDatabase = () => import('../../database/transactionRepository').then(module => module.getDatabase());

const SETTING_KEY = 'privacy_mode';
const listeners = new Set<() => void>();
let hidden = false;

function emit() {
  listeners.forEach(listener => listener());
}

export function isPrivacyOn(): boolean {
  return hidden;
}

/** Switches privacy mode right away, then saves it on the phone so it survives a restart. */
export function setPrivacyOn(next: boolean) {
  if (next === hidden) return;
  hidden = next;
  emit();
  getDatabase()
    .then(database =>
      database.execute('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [SETTING_KEY, next ? '1' : '0']),
    )
    .catch(() => undefined);
}

/** Reads the saved choice. Called once when the app starts. */
export async function loadPrivacy(): Promise<void> {
  try {
    const database = await getDatabase();
    const result = await database.execute('SELECT value FROM app_settings WHERE key = ?', [SETTING_KEY]);
    const saved = result.rows[0]?.value === '1';
    if (saved !== hidden) {
      hidden = saved;
      emit();
    }
  } catch {
    // Without a saved value amounts simply stay visible.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `mask(text)` returns "--" instead of `text` while privacy mode is on. */
export function usePrivacy() {
  const on = useSyncExternalStore(subscribe, isPrivacyOn, isPrivacyOn);
  return { hidden: on, mask: (text: string) => (on ? HIDDEN_AMOUNT : text) };
}
