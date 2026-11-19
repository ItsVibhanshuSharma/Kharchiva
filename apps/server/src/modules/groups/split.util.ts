export enum SplitType {
  EQUAL = 'EQUAL',
  EXACT = 'EXACT',
  PERCENT = 'PERCENT',
}

/** Largest single amount accepted (₹10 crore). Keeps percent math inside safe integers. */
export const MAX_AMOUNT_PAISE = 10_000_000_000;
export const FULL_PERCENT_BP = 10_000;

export interface SplitInput {
  memberId: string;
  /** EXACT: paise. PERCENT: basis points (10000 = 100%). EQUAL: ignored. */
  value?: number;
}

export interface Share {
  memberId: string;
  amountPaise: number;
}

export class SplitError extends Error {}

/**
 * Turns split input into exact paise shares that always sum to totalPaise.
 * Rounding leftovers go one paisa at a time, so no money is created or lost.
 */
export function computeShares(totalPaise: number, type: SplitType, entries: SplitInput[]): Share[] {
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 1 || totalPaise > MAX_AMOUNT_PAISE) {
    throw new SplitError('Amount is out of range');
  }
  if (entries.length === 0) throw new SplitError('At least one member must share the expense');
  assertUnique(entries.map((entry) => entry.memberId));

  if (type === SplitType.EQUAL) {
    const base = Math.floor(totalPaise / entries.length);
    const remainder = totalPaise - base * entries.length;
    return entries.map((entry, index) => ({
      memberId: entry.memberId,
      amountPaise: base + (index < remainder ? 1 : 0),
    }));
  }

  const values = entries.map((entry) => {
    if (!Number.isSafeInteger(entry.value) || (entry.value as number) < 0) {
      throw new SplitError('Split values must be non-negative integers');
    }
    return entry.value as number;
  });
  const sum = values.reduce((a, b) => a + b, 0);

  if (type === SplitType.EXACT) {
    if (sum !== totalPaise) throw new SplitError('Exact amounts must add up to the total');
    return entries.map((entry, index) => ({ memberId: entry.memberId, amountPaise: values[index] }));
  }

  if (sum !== FULL_PERCENT_BP) throw new SplitError('Percentages must add up to 100%');
  const raw = values.map((bp) => (totalPaise * bp) / FULL_PERCENT_BP);
  const floors = raw.map(Math.floor);
  let leftover = totalPaise - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (leftover <= 0) break;
    floors[index] += 1;
    leftover -= 1;
  }
  return entries.map((entry, index) => ({ memberId: entry.memberId, amountPaise: floors[index] }));
}

export function validatePayers(totalPaise: number, payers: Share[]): void {
  if (payers.length === 0) throw new SplitError('At least one payer is required');
  assertUnique(payers.map((payer) => payer.memberId));
  let sum = 0;
  for (const payer of payers) {
    if (!Number.isSafeInteger(payer.amountPaise) || payer.amountPaise < 1) {
      throw new SplitError('Payer amounts must be positive integers');
    }
    sum += payer.amountPaise;
  }
  if (sum !== totalPaise) throw new SplitError('Paid amounts must add up to the total');
}

export interface BalanceExpense {
  payers: Share[];
  splits: Share[];
}

export interface BalanceSettlement {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

/** Net balance per member. Positive: the group owes them. Negative: they owe the group. */
export function computeBalances(
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[],
): Map<string, number> {
  const balances = new Map<string, number>();
  const add = (memberId: string, delta: number) => {
    balances.set(memberId, (balances.get(memberId) ?? 0) + delta);
  };
  for (const expense of expenses) {
    for (const payer of expense.payers) add(payer.memberId, payer.amountPaise);
    for (const share of expense.splits) add(share.memberId, -share.amountPaise);
  }
  for (const settlement of settlements) {
    add(settlement.fromMemberId, settlement.amountPaise);
    add(settlement.toMemberId, -settlement.amountPaise);
  }
  return balances;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

/** Fewest-transfers settle-up: repeatedly match the biggest debtor with the biggest creditor. */
export function simplifyDebts(balances: Map<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];
  for (const [id, amount] of balances) {
    if (amount < 0) debtors.push({ id, amount: -amount });
    else if (amount > 0) creditors.push({ id, amount });
  }
  const byAmount = (a: { id: string; amount: number }, b: { id: string; amount: number }) =>
    b.amount - a.amount || a.id.localeCompare(b.id);
  debtors.sort(byAmount);
  creditors.sort(byAmount);
  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountPaise: amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
    debtors.sort(byAmount);
    creditors.sort(byAmount);
  }
  return transfers;
}

function assertUnique(ids: string[]): void {
  if (new Set(ids).size !== ids.length) throw new SplitError('A member appears more than once');
}
