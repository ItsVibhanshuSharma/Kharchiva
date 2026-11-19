import { parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';

/** Id used for "me" inside a split. Friends have their own ids. */
export const ME = 'ME';

export type SplitMethod = 'EQUAL' | 'CUSTOM' | 'PERCENT';

/** One person's part of a bill. `percent` is kept only for percentage splits, so editing shows what was typed. */
export type Share = { personId: string; paise: number; percent?: number };

export type SplitDraft = {
  method: SplitMethod;
  /** Friends in the split (not including me). */
  people: string[];
  /** ME or a friend's id. */
  paidBy: string;
  /** What was typed per person (ME included), in rupees. */
  custom: Record<string, string>;
  /** What was typed per person (ME included), as a percentage. */
  percent: Record<string, string>;
};

export const emptyDraft = (): SplitDraft => ({ method: 'EQUAL', people: [], paidBy: ME, custom: {}, percent: {} });

export type SharesResult = { shares: Share[]; problem?: undefined } | { shares?: undefined; problem: string };

/** Splits `totalPaise` evenly; the leftover paise go one each to the first people so the sum is exact. */
export function equalShares(totalPaise: number, personIds: string[]): Share[] {
  const base = Math.floor(totalPaise / personIds.length);
  const extra = totalPaise - base * personIds.length;
  return personIds.map((personId, index) => ({ personId, paise: base + (index < extra ? 1 : 0) }));
}

/**
 * Splits by percentage given in hundredths of a percent (50% = 5000). The basis points must add up to
 * 10000. Leftover paise go to the largest fractional parts so the sum is exact.
 */
export function percentShares(totalPaise: number, entries: { personId: string; basisPoints: number }[]): Share[] {
  const raw = entries.map(entry => (totalPaise * entry.basisPoints) / 10000);
  const floors = raw.map(Math.floor);
  let leftover = totalPaise - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (leftover <= 0) break;
    floors[index] += 1;
    leftover -= 1;
  }
  return entries.map((entry, index) => ({ personId: entry.personId, paise: floors[index], percent: entry.basisPoints / 100 }));
}

/** Basis points from text like "33.5"; null when it is not a number with up to two decimals. */
export function parsePercent(value: string | undefined): number | null {
  const text = (value ?? '').trim().replace('%', '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const basisPoints = Math.round(Number(text) * 100);
  return basisPoints > 0 ? basisPoints : null;
}

const rupeesText = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/**
 * Switches the split method. The first time Custom or Percent is opened its boxes start with the
 * equal split, so the user only has to change the numbers that differ.
 */
export function withMethod(draft: SplitDraft, method: SplitMethod, totalPaise: number | null): SplitDraft {
  const next: SplitDraft = { ...draft, method };
  const ids = [ME, ...draft.people];
  if (method === 'CUSTOM' && totalPaise && ids.every(id => !draft.custom[id])) {
    next.custom = Object.fromEntries(equalShares(totalPaise, ids).map(share => [share.personId, rupeesText(share.paise)]));
  }
  if (method === 'PERCENT' && ids.every(id => !draft.percent[id])) {
    const base = Math.floor(10000 / ids.length);
    const extra = 10000 - base * ids.length;
    next.percent = Object.fromEntries(ids.map((id, index) => [id, String((base + (index < extra ? 1 : 0)) / 100)]));
  }
  return next;
}

/** Each person's share for the current draft, or the first problem to show the user. */
export function computeShares(draft: SplitDraft, totalPaise: number | null): SharesResult {
  if (!totalPaise) return { problem: 'Pehle total amount daalo.' };
  if (draft.people.length === 0) return { problem: 'Pehle dost chuno.' };
  const ids = [ME, ...draft.people];

  if (draft.method === 'EQUAL') return { shares: equalShares(totalPaise, ids) };

  if (draft.method === 'CUSTOM') {
    const shares: Share[] = [];
    for (const personId of ids) {
      const paise = parseRupeesToPaise(draft.custom[personId] ?? '');
      if (!paise) return { problem: 'Har kisi ka hissa daalo.' };
      shares.push({ personId, paise });
    }
    const sum = shares.reduce((total, share) => total + share.paise, 0);
    if (sum !== totalPaise) return { problem: 'Hisse jodkar total ke barabar hone chahiye.' };
    return { shares };
  }

  const entries: { personId: string; basisPoints: number }[] = [];
  for (const personId of ids) {
    const basisPoints = parsePercent(draft.percent[personId]);
    if (!basisPoints) return { problem: 'Har kisi ka percent daalo.' };
    entries.push({ personId, basisPoints });
  }
  if (entries.reduce((total, entry) => total + entry.basisPoints, 0) !== 10000) {
    return { problem: 'Percent jodkar 100 hone chahiye.' };
  }
  return { shares: percentShares(totalPaise, entries) };
}

/** Rules every saved split must follow. Returns a message, or null when it is fine. */
export function splitProblem(totalPaise: number, paidBy: string, shares: Share[]): string | null {
  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) return 'Pehle total amount daalo.';
  if (shares.length < 2) return 'Pehle dost chuno.';
  const ids = shares.map(share => share.personId);
  if (new Set(ids).size !== ids.length) return 'Ek dost do baar nahi aa sakta.';
  if (!ids.includes(ME)) return 'Aapka hissa zaroori hai.';
  if (!ids.includes(paidBy)) return 'Pay karne wala split me hona chahiye.';
  if (shares.some(share => !Number.isSafeInteger(share.paise) || share.paise <= 0)) return 'Har hissa ₹0 se zyada hona chahiye.';
  if (shares.reduce((sum, share) => sum + share.paise, 0) !== totalPaise) return 'Hisse jodkar total ke barabar hone chahiye.';
  return null;
}

export const myShare = (shares: Share[]): number => shares.find(share => share.personId === ME)?.paise ?? 0;

/** Turns a saved split back into what the form shows. */
export function draftFromShares(method: SplitMethod, paidBy: string, shares: Share[]): SplitDraft {
  const custom: Record<string, string> = {};
  const percent: Record<string, string> = {};
  for (const share of shares) {
    custom[share.personId] = String(share.paise / 100);
    if (share.percent !== undefined) percent[share.personId] = String(share.percent);
  }
  return { method, people: shares.filter(share => share.personId !== ME).map(share => share.personId), paidBy, custom, percent };
}

// ---------------------------------------------------------------- balances

export type SplitLike = { paidBy: string; shares: Share[] };
export type SettlementLike = { personId: string; direction: 'THEY_PAID_ME' | 'I_PAID_THEM'; amountPaise: number };

/**
 * What each friend owes me (positive) or I owe them (negative). Only the money between me and one
 * friend counts; what two friends owe each other is not mine to track.
 */
export function balances(splits: SplitLike[], settlements: SettlementLike[]): Map<string, number> {
  const result = new Map<string, number>();
  const add = (personId: string, paise: number) => result.set(personId, (result.get(personId) ?? 0) + paise);
  for (const split of splits) {
    if (split.paidBy === ME) {
      for (const share of split.shares) if (share.personId !== ME) add(share.personId, share.paise);
    } else {
      add(split.paidBy, -myShare(split.shares));
    }
  }
  for (const item of settlements) add(item.personId, item.direction === 'THEY_PAID_ME' ? -item.amountPaise : item.amountPaise);
  return result;
}

export function totals(values: Iterable<number>): { owedToMe: number; iOwe: number } {
  let owedToMe = 0;
  let iOwe = 0;
  for (const value of values) {
    if (value > 0) owedToMe += value;
    else if (value < 0) iOwe += -value;
  }
  return { owedToMe, iOwe };
}
