import type { Strings } from '../languages';
import { addExpense } from './addExpense';
import { authFlow } from './authFlow';
import { authWelcome } from './authWelcome';
import { budget } from './budget';
import { categories } from './categories';
import { home } from './home';
import { lists } from './lists';
import { profile } from './profile';
import { recurring } from './recurring';
import { security } from './security';
import { sheets } from './sheets';
import { statement } from './statement';
import { transactions } from './transactions';

/** Every translated string, keyed by its English (or Hinglish) source text. */
export const ALL_STRINGS: Strings = {
  ...profile,
  ...categories,
  ...home,
  ...transactions,
  ...statement,
  ...addExpense,
  ...sheets,
  ...recurring,
  ...budget,
  ...lists,
  ...security,
  ...authWelcome,
  ...authFlow,
};
