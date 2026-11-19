import { useSyncExternalStore } from 'react';
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  type LanguageCode,
} from './languages';
import bn from './locales/bn';
import gu from './locales/gu';
import hi from './locales/hi';
import kn from './locales/kn';
import ml from './locales/ml';
import mr from './locales/mr';
import pa from './locales/pa';
import ta from './locales/ta';
import te from './locales/te';

/**
 * Screens are written in English (or the app's own Hinglish). That text is the lookup key:
 * a language file maps it to the translation, and a missing entry falls back to the key.
 */
export type Dictionary = Readonly<Record<string, string>>;
const DICTIONARIES: Partial<Record<LanguageCode, Dictionary>> = {
  hi,
  pa,
  gu,
  mr,
  bn,
  ta,
  te,
  kn,
  ml,
};

// Loaded on first use so screens that only read the language do not pull in SQLite.
const getDatabase = () =>
  import('../database/transactionRepository').then(module =>
    module.getDatabase(),
  );
const SETTING_KEY = 'language';
const listeners = new Set<() => void>();
let current: LanguageCode = DEFAULT_LANGUAGE;

function emit() {
  listeners.forEach(listener => listener());
}

export const getLanguage = (): LanguageCode => current;

/** Replaces `{name}` markers with the given values. */
function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Translates `text` into `language`; unknown text comes back unchanged. */
export function translate(
  language: LanguageCode,
  text: string,
  params?: Record<string, string | number>,
): string {
  return fill(DICTIONARIES[language]?.[text] ?? text, params);
}

export const t = (text: string, params?: Record<string, string | number>) =>
  translate(current, text, params);

/** Switches language right away, then saves it on the phone so it survives a restart. */
export function setLanguage(next: LanguageCode) {
  if (next === current) return;
  current = next;
  emit();
  getDatabase()
    .then(database =>
      database.execute(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        [SETTING_KEY, next],
      ),
    )
    .catch(() => undefined);
}

/** Reads the saved choice. Called once when the app starts. */
export async function loadLanguage(): Promise<void> {
  try {
    const database = await getDatabase();
    const result = await database.execute(
      'SELECT value FROM app_settings WHERE key = ?',
      [SETTING_KEY],
    );
    const saved = result.rows[0]?.value;
    if (isLanguageCode(saved) && saved !== current) {
      current = saved;
      emit();
    }
  } catch {
    // Without a saved value the app stays in English.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the component when the language changes. Returns the current code and a `t` bound to it. */
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return {
    language,
    t: (text: string, params?: Record<string, string | number>) =>
      translate(language, text, params),
  };
}
