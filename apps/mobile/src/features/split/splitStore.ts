import { useEffect, useSyncExternalStore } from 'react';
import { getSplitRepository } from '../../database/splitRepository';
import type {
  ExpenseSplit,
  NewExpenseSplit,
  NewSettlement,
  SplitPerson,
  SplitSettlement,
} from '../../database/repositories/SplitRepository';
import { balances, totals } from './splitMath';

export type SplitState = {
  people: SplitPerson[];
  splits: ExpenseSplit[];
  settlements: SplitSettlement[];
  /** False until the first load finishes. */
  loaded: boolean;
};

const EMPTY: SplitState = { people: [], splits: [], settlements: [], loaded: false };

let state: SplitState = EMPTY;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: SplitState) {
  state = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSplitState = (): SplitState => state;

/** Loads friends, splits and settlements once; later calls reuse them unless `force` is set. */
export function loadSplits(force = false): Promise<void> {
  if (state.loaded && !force) return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const repository = await getSplitRepository();
      const [people, splits, settlements] = await Promise.all([
        repository.listPeople(),
        repository.listSplits(),
        repository.listSettlements(),
      ]);
      setState({ people, splits, settlements, loaded: true });
    } catch {
      // Keep what we had; the rest of the app does not depend on splits.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Friends, splits and settlements; triggers the first load. */
export function useSplits(): SplitState {
  const snapshot = useSyncExternalStore(subscribe, getSplitState, getSplitState);
  useEffect(() => {
    loadSplits();
  }, []);
  return snapshot;
}

// ---------------------------------------------------------------- selectors

/** Money between the user and each friend: positive means the friend owes the user. */
export function balanceMap(current: SplitState): Map<string, number> {
  const active = new Set(current.people.map(person => person.id));
  const result = balances(current.splits, current.settlements);
  // A removed friend no longer shows up.
  for (const personId of [...result.keys()]) if (!active.has(personId)) result.delete(personId);
  return result;
}

export function balanceTotals(current: SplitState) {
  return totals(balanceMap(current).values());
}

export const expenseIdsWithSplit = (current: SplitState): Set<string> => new Set(current.splits.map(split => split.expenseId));

// ------------------------------------------------------------------ changes

async function afterChange() {
  await loadSplits(true);
}

export async function addSplitPerson(name: string): Promise<SplitPerson> {
  const repository = await getSplitRepository();
  const created = await repository.addPerson(name);
  await afterChange();
  return created;
}

export async function removeSplitPerson(id: string): Promise<void> {
  const repository = await getSplitRepository();
  await repository.removePerson(id);
  await afterChange();
}

export async function saveExpenseSplit(input: NewExpenseSplit): Promise<ExpenseSplit> {
  const repository = await getSplitRepository();
  const saved = await repository.saveSplit(input);
  await afterChange();
  return saved;
}

export async function removeExpenseSplit(expenseId: string): Promise<void> {
  const repository = await getSplitRepository();
  await repository.removeForExpense(expenseId);
  await afterChange();
}

export async function recordSettlement(input: NewSettlement): Promise<void> {
  const repository = await getSplitRepository();
  await repository.addSettlement(input);
  await afterChange();
}

export async function undoSettlement(id: string): Promise<void> {
  const repository = await getSplitRepository();
  await repository.removeSettlement(id);
  await afterChange();
}

export function resetSplitsForTests() {
  inFlight = null;
  setState(EMPTY);
}
