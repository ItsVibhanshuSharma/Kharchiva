import { parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';
import { MAX_AMOUNT_PAISE, SplitError, SplitType, computeShares } from './groupMath';
import type { GroupExpense, GroupExpenseInput } from './types';

export type ExpenseForm = {
  title: string;
  amountText: string;
  categoryKey: string;
  /** YYYY-MM-DD */
  day: string;
  note: string;
  payerId: string;
  splitType: SplitType;
  /** Members who share the expense. */
  selected: string[];
  /** EXACT: rupees. PERCENT: percent. Keyed by member id. */
  values: Record<string, string>;
};

export type FormResult = { ok: true; input: GroupExpenseInput } | { ok: false; error: string };

/** Rupees text to paise, allowing empty and zero (unlike parseRupeesToPaise, which needs a positive amount). */
function rupeesToPaiseAllowZero(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  if (/^0*(\.0{0,2})?$/.test(trimmed.replace(/[₹,\s]/g, ''))) return 0;
  return parseRupeesToPaise(trimmed);
}

/** "33.33" to 3333 basis points. Null when the text is not a percent with up to 2 decimals. */
export function percentToBasisPoints(text: string): number | null {
  const trimmed = text.trim().replace('%', '');
  if (trimmed === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function buildExpenseInput(form: ExpenseForm): FormResult {
  const title = form.title.trim();
  if (!title) return { ok: false, error: 'Enter what this expense was for.' };
  const amountPaise = parseRupeesToPaise(form.amountText);
  if (amountPaise === null) return { ok: false, error: 'Enter a valid amount, like 450 or 450.50.' };
  if (amountPaise > MAX_AMOUNT_PAISE) return { ok: false, error: 'That amount is too large.' };
  if (!form.payerId) return { ok: false, error: 'Choose who paid.' };
  if (form.selected.length === 0) return { ok: false, error: 'Choose at least one person to split with.' };

  const splits: { memberId: string; value?: number }[] = [];
  for (const memberId of form.selected) {
    if (form.splitType === SplitType.EQUAL) {
      splits.push({ memberId });
    } else if (form.splitType === SplitType.EXACT) {
      const value = rupeesToPaiseAllowZero(form.values[memberId] ?? '');
      if (value === null) return { ok: false, error: 'Check the amounts. Use numbers like 120 or 120.50.' };
      splits.push({ memberId, value });
    } else {
      const value = percentToBasisPoints(form.values[memberId] ?? '');
      if (value === null) return { ok: false, error: 'Check the percentages. Use numbers like 25 or 33.33.' };
      splits.push({ memberId, value });
    }
  }

  try {
    computeShares(amountPaise, form.splitType, splits);
  } catch (error) {
    if (error instanceof SplitError) return { ok: false, error: friendlySplitError(error.message) };
    throw error;
  }

  return {
    ok: true,
    input: {
      title,
      amountPaise,
      categoryKey: form.categoryKey || undefined,
      note: form.note.trim() || undefined,
      expenseDate: `${form.day}T12:00:00.000Z`,
      payers: [{ memberId: form.payerId, amountPaise }],
      splitType: form.splitType,
      splits,
    },
  };
}

function friendlySplitError(message: string): string {
  if (message.includes('Exact amounts')) return 'The amounts do not add up to the total.';
  if (message.includes('100%')) return 'The percentages must add up to 100%.';
  return message;
}

/** Live preview of each person's share, or null while the numbers are incomplete. */
export function previewShares(form: ExpenseForm): Record<string, number> | null {
  const amountPaise = parseRupeesToPaise(form.amountText);
  if (amountPaise === null || form.selected.length === 0) return null;
  const result = buildExpenseInput(form);
  if (!result.ok) return null;
  const shares = computeShares(amountPaise, form.splitType, result.input.splits);
  return Object.fromEntries(shares.map(share => [share.memberId, share.amountPaise]));
}

/** How much is still unassigned (EXACT, in paise) or left to reach 100% (PERCENT, in basis points). */
export function splitRemainder(form: ExpenseForm): number | null {
  if (form.splitType === SplitType.EXACT) {
    const total = parseRupeesToPaise(form.amountText);
    if (total === null) return null;
    let sum = 0;
    for (const id of form.selected) {
      const value = rupeesToPaiseAllowZero(form.values[id] ?? '');
      if (value === null) return null;
      sum += value;
    }
    return total - sum;
  }
  if (form.splitType === SplitType.PERCENT) {
    let sum = 0;
    for (const id of form.selected) {
      const value = percentToBasisPoints(form.values[id] ?? '');
      if (value === null) return null;
      sum += value;
    }
    return 10000 - sum;
  }
  return null;
}

/** Starting values for the edit screen. */
export function formFromExpense(expense: GroupExpense): ExpenseForm {
  const values: Record<string, string> = {};
  for (const split of expense.splits) {
    values[split.memberId] =
      expense.splitType === SplitType.PERCENT
        ? String(Math.round((split.amountPaise / expense.amountPaise) * 10000) / 100)
        : String(split.amountPaise / 100);
  }
  return {
    title: expense.title,
    amountText: String(expense.amountPaise / 100),
    categoryKey: expense.categoryKey ?? '',
    day: expense.expenseDate.slice(0, 10),
    note: expense.note ?? '',
    payerId: expense.payers[0]?.memberId ?? '',
    splitType: expense.splitType,
    selected: expense.splits.map(split => split.memberId),
    values,
  };
}
