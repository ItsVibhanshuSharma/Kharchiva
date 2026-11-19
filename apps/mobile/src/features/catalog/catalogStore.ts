import { useEffect, useSyncExternalStore } from 'react';
import { getCatalogRepository } from '../../database/catalogRepository';
import {
  MAX_NAME_LENGTH,
  type Budget,
  type CustomCategory,
  type CustomPaymentSource,
  type ListEntryType,
} from '../../database/repositories/CatalogRepository';
import { t } from '../../i18n/i18n';
import { DEFAULT_PAYMENT_SOURCES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../theme/categories';

export type CatalogState = {
  customCategories: CustomCategory[];
  paymentSources: CustomPaymentSource[];
  budgets: Budget[];
  /** Built-in categories the user hid, as `type:name` keys (see `hiddenKey`). */
  hiddenDefaults: string[];
  /** False until the first load finishes; built-in lists work either way. */
  loaded: boolean;
};

const EMPTY: CatalogState = { customCategories: [], paymentSources: [], budgets: [], hiddenDefaults: [], loaded: false };

let state: CatalogState = EMPTY;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: CatalogState) {
  state = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCatalog(): CatalogState {
  return state;
}

/** Loads the user's lists once; later calls reuse the result unless `force` is set. */
export function loadCatalog(force = false): Promise<void> {
  if (state.loaded && !force) return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const repository = await getCatalogRepository();
      const [customCategories, paymentSources, budgets, hiddenDefaults] = await Promise.all([
        repository.listCategories(),
        repository.listPaymentSources(),
        repository.listBudgets(),
        repository.listHiddenDefaults().catch(() => [] as string[]),
      ]);
      setState({ customCategories, paymentSources, budgets, hiddenDefaults, loaded: true });
    } catch {
      // Keep whatever we had; built-in categories still work.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Current lists; triggers the first load. */
export function useCatalog(): CatalogState {
  const snapshot = useSyncExternalStore(subscribe, getCatalog, getCatalog);
  useEffect(() => {
    loadCatalog();
  }, []);
  return snapshot;
}

// ---------------------------------------------------------------- selectors

/** "Other" is the fallback in every list, so it cannot be hidden. */
export const UNHIDEABLE_CATEGORY = 'Other';
export const hiddenKey = (type: ListEntryType, name: string) => `${type}:${name}`;
export function isDefaultHidden(catalog: CatalogState, type: ListEntryType, name: string): boolean {
  return name !== UNHIDEABLE_CATEGORY && catalog.hiddenDefaults.includes(hiddenKey(type, name));
}
/** Categories to offer when picking: built-in ones the user has not hidden, then their own, then "Other". */
export function categoryNames(catalog: CatalogState, type: ListEntryType): string[] {
  const builtIn: readonly string[] = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).filter(
    name => !isDefaultHidden(catalog, type, name),
  );
  const custom = catalog.customCategories.filter(item => item.type === type).map(item => item.name);
  // "Other" stays last so the user's own categories sit next to the built-in ones.
  const withoutOther = builtIn.filter(name => name !== 'Other');
  return [...withoutOther, ...custom, ...(builtIn.includes('Other') ? ['Other'] : [])];
}

export function paymentSourceNames(catalog: CatalogState): string[] {
  return [...DEFAULT_PAYMENT_SOURCES, ...catalog.paymentSources.map(item => item.name)];
}

export function customCategoryFor(catalog: CatalogState, name: string, type: ListEntryType): CustomCategory | undefined {
  const key = name.trim().toLowerCase();
  return catalog.customCategories.find(item => item.type === type && item.name.toLowerCase() === key);
}

/** Names already taken, hidden built-ins included, so a custom one cannot clash with them. */
function takenCategoryNames(type: ListEntryType): string[] {
  const builtIn: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return [...builtIn, ...state.customCategories.filter(item => item.type === type).map(item => item.name)];
}
/** Message for an invalid new name, or null when it can be added. */
export function nameProblem(name: string, existing: readonly string[]): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Naam likho.';
  if (trimmed.length > MAX_NAME_LENGTH) return t('Naam {n} letters tak rakho.', { n: MAX_NAME_LENGTH });
  if (existing.some(item => item.toLowerCase() === trimmed.toLowerCase())) return t('"{name}" pehle se hai.', { name: trimmed });
  return null;
}

// ---------------------------------------------------------------- changes

async function afterChange() {
  await loadCatalog(true);
}

export async function addCustomCategory(input: { name: string; type: ListEntryType; emoji?: string | null }): Promise<CustomCategory> {
  const problem = nameProblem(input.name, takenCategoryNames(input.type));
  if (problem) throw new Error(problem);
  const repository = await getCatalogRepository();
  const created = await repository.addCategory(input);
  await afterChange();
  return created;
}

export async function removeCustomCategory(id: string): Promise<void> {
  const repository = await getCatalogRepository();
  await repository.removeCategory(id);
  // A budget on a removed category would never show, so drop it too.
  const removed = state.customCategories.find(item => item.id === id);
  const budget = removed && state.budgets.find(item => item.category.toLowerCase() === removed.name.toLowerCase());
  if (budget) await repository.removeBudget(budget.id);
  await afterChange();
}

export async function addPaymentSource(name: string): Promise<CustomPaymentSource> {
  const problem = nameProblem(name, paymentSourceNames(state));
  if (problem) throw new Error(problem);
  const repository = await getCatalogRepository();
  const created = await repository.addPaymentSource(name);
  await afterChange();
  return created;
}

export async function removePaymentSource(id: string): Promise<void> {
  const repository = await getCatalogRepository();
  await repository.removePaymentSource(id);
  await afterChange();
}

export async function setBudget(category: string, limitPaise: number): Promise<void> {
  const repository = await getCatalogRepository();
  await repository.setBudget(category, limitPaise);
  await afterChange();
}

export async function removeBudget(id: string): Promise<void> {
  const repository = await getCatalogRepository();
  await repository.removeBudget(id);
  await afterChange();
}

/** Hides or shows a built-in category in pickers. Past entries keep their category. */
export async function setDefaultHidden(type: ListEntryType, name: string, hidden: boolean): Promise<void> {
  if (name === UNHIDEABLE_CATEGORY) return;
  const key = hiddenKey(type, name);
  const next = hidden ? [...state.hiddenDefaults.filter(item => item !== key), key] : state.hiddenDefaults.filter(item => item !== key);
  const repository = await getCatalogRepository();
  await repository.setHiddenDefaults(next);
  await afterChange();
}
/** Test helper: forget loaded lists between tests. */
export function resetCatalogForTests() {
  inFlight = null;
  setState(EMPTY);
}
