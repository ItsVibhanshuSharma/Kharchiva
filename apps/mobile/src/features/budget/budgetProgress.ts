import { t } from '../../i18n/i18n';
import { TOTAL_BUDGET, type Budget } from '../../database/repositories/CatalogRepository';
import { formatRupees } from '../../utils/money';

export type BudgetLevel = 'ok' | 'near' | 'over';

export type BudgetProgress = {
  budget: Budget;
  label: string;
  spentPaise: number;
  limitPaise: number;
  /** limit − spent; negative once the limit is passed. */
  remainingPaise: number;
  /** spent / limit, not capped (1.2 = 120%). */
  ratio: number;
  level: BudgetLevel;
};

/** Share of the limit at which a budget is "close". */
export const NEAR_RATIO = 0.8;

type ExpenseLike = { category: string; amountPaise: number };

export function budgetLabel(category: string): string {
  return category === TOTAL_BUDGET ? 'Sab kharche' : category;
}

function spentFor(category: string, expenses: ExpenseLike[]): number {
  const key = category.toLowerCase();
  return expenses
    .filter(item => category === TOTAL_BUDGET || item.category.toLowerCase() === key)
    .reduce((sum, item) => sum + item.amountPaise, 0);
}

function levelOf(ratio: number): BudgetLevel {
  if (ratio > 1) return 'over';
  if (ratio >= NEAR_RATIO) return 'near';
  return 'ok';
}

/** Progress for each budget this month, the total first, then the fullest. Spent is always derived from expenses. */
export function budgetProgress(budgets: Budget[], monthExpenses: ExpenseLike[]): BudgetProgress[] {
  return budgets
    .map(budget => {
      const spentPaise = spentFor(budget.category, monthExpenses);
      const ratio = budget.limitPaise > 0 ? spentPaise / budget.limitPaise : 0;
      return {
        budget,
        label: budgetLabel(budget.category),
        spentPaise,
        limitPaise: budget.limitPaise,
        remainingPaise: budget.limitPaise - spentPaise,
        ratio,
        level: levelOf(ratio),
      };
    })
    .sort((a, b) => {
      if (a.budget.category === TOTAL_BUDGET) return -1;
      if (b.budget.category === TOTAL_BUDGET) return 1;
      return b.ratio - a.ratio || a.label.localeCompare(b.label);
    });
}

/** "₹1,500 bacha" or "₹500 zyada". Plain facts, no judgement (PRD §4.2). */
export function remainingText(progress: Pick<BudgetProgress, 'remainingPaise'>): string {
  return progress.remainingPaise >= 0
    ? t('{amount} bacha', { amount: formatRupees(progress.remainingPaise) })
    : t('{amount} zyada', { amount: formatRupees(-progress.remainingPaise) });
}

/**
 * Message to show after saving an expense, only when it moved a budget past 80% or
 * past its limit. `monthExpenses` must already include the new expense.
 */
export function budgetNotice(
  expense: ExpenseLike,
  budgets: Budget[],
  monthExpenses: ExpenseLike[],
): { tone: 'info' | 'error'; message: string } | null {
  const relevant = budgets
    .filter(budget => budget.category === TOTAL_BUDGET || budget.category.toLowerCase() === expense.category.toLowerCase())
    // Category budget before the total, so it wins a tie in the stable sort below.
    .sort((a, b) => Number(a.category === TOTAL_BUDGET) - Number(b.category === TOTAL_BUDGET));
  const notices = relevant
    .map(budget => {
      const after = spentFor(budget.category, monthExpenses);
      const before = after - expense.amountPaise;
      const label = budgetLabel(budget.category);
      if (after > budget.limitPaise && before <= budget.limitPaise) {
        return { severity: 2, tone: 'error' as const, message: t('{label} budget se {amount} zyada ho gaya', { label: t(label), amount: formatRupees(after - budget.limitPaise) }) };
      }
      const nearAt = budget.limitPaise * NEAR_RATIO;
      if (after >= nearAt && before < nearAt && after <= budget.limitPaise) {
        const percent = Math.floor((after / budget.limitPaise) * 100);
        return { severity: 1, tone: 'info' as const, message: t('{label} budget ka {percent}% use ho gaya ({spent} / {limit})', { label: t(label), percent, spent: formatRupees(after), limit: formatRupees(budget.limitPaise) }) };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.severity - a.severity);
  const top = notices[0];
  return top ? { tone: top.tone, message: top.message } : null;
}
