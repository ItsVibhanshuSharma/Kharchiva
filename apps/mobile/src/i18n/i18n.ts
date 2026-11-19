import { useSyncExternalStore } from 'react';
import { localizeDates } from './calendar';
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  type LanguageCode,
} from './languages';
import { ALL_STRINGS } from './strings';

/**
 * Screens are written in English (or the app's own Hinglish). That text is the lookup key:
 * the files in `strings/` map it to the translation, and a missing entry falls back to the key.
 */
type Params = Record<string, string | number>;

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
function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Translates `text` into `language`; unknown text comes back unchanged. */
export function translate(
  language: LanguageCode,
  text: string,
  params?: Params,
): string {
  if (language === 'en') return fill(text, params);
  const known = Object.prototype.hasOwnProperty.call(ALL_STRINGS, text);
  // Month and weekday names are swapped in everything shown, so dates like "10 Nov 2026" follow the language too.
  return localizeDates(
    language,
    fill(known ? ALL_STRINGS[text][language] : text, params),
  );
}

export const t = (text: string, params?: Params) =>
  translate(current, text, params);
/** Month and weekday names inside a date text such as "10 Sep 2026", in the current language. */
export const tDate = (text: string) => localizeDates(current, text);

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

/** Re-renders the component when the language changes. Returns the current code and helpers bound to it. */
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return {
    language,
    t: (text: string, params?: Params) => translate(language, text, params),
    /** Translates month and weekday names in a date text such as "10 Sep 2026". */
    tDate: (text: string) => localizeDates(language, text),
  };
}
