import { showSnackbar } from '../../components/snackbar';
import { getTransactionRepository } from '../../database/transactionRepository';
import { currentMonthKey, monthRange } from '../../screens/home/monthSummary';
import { getCatalog, loadCatalog } from '../catalog/catalogStore';
import { budgetNotice } from './budgetProgress';

/** Wait for the save celebration (≈1.7s) so the two never stack. */
const AFTER_CELEBRATION_MS = 1900;

/**
 * After a new expense, tell the user if it moved one of their budgets past 80% or
 * past the limit. Silent when they have no budgets: budgets are opt-in.
 */
export async function checkBudgetsAfterExpense(expense: { category: string; amountPaise: number; occurredAt: string }) {
  await loadCatalog();
  const { budgets } = getCatalog();
  if (budgets.length === 0) return;
  try {
    const repository = await getTransactionRepository();
    const month = currentMonthKey(new Date(expense.occurredAt));
    const monthExpenses = await repository.listTransactions({ type: 'expense', ...monthRange(month) });
    const notice = budgetNotice(expense, budgets, monthExpenses);
    if (notice) setTimeout(() => showSnackbar({ tone: notice.tone, message: notice.message, durationMs: 4000 }), AFTER_CELEBRATION_MS);
  } catch {
    // Budget hints are a nice-to-have; never block or fail a save over them.
  }
}
