import type { Strings } from '../languages';
import { categories } from './categories';
import { home } from './home';
import { profile } from './profile';
import { statement } from './statement';
import { transactions } from './transactions';

/** Every translated string, keyed by its English (or Hinglish) source text. */
export const ALL_STRINGS: Strings = {
  ...profile,
  ...categories,
  ...home,
  ...transactions,
  ...statement,
};
