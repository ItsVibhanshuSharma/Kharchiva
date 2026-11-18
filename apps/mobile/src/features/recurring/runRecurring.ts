import { getRecurringRepository } from '../../database/recurringRepository';
import type { RecurringItem } from '../../database/repositories/RecurringRepository';
import { getTransactionRepository } from '../../database/transactionRepository';
import { dateForExpenseInput } from '../../screens/expenses/expenseInputUtils';
import { notifyEntriesChanged } from '../entries/entryEvents';
import { dueOccurrences, nextOccurrence } from './schedule';

/** One row per item and date; creating it again returns the existing row. */
export const occurrenceId = (item: Pick<RecurringItem, 'id'>, date: string) => `rec:${item.id}:${date}`;

/** Generated entries are timed mid-morning India time on their date. */
const occurredAtFor = (date: string) => new Date(`${date}T09:00:00.000+05:30`).toISOString();

async function addOccurrence(item: RecurringItem, date: string) {
  const repository = await getTransactionRepository();
  const common = { amountPaise: item.amountPaise, category: item.category, occurredAt: occurredAtFor(date), clientId: occurrenceId(item, date) };
  if (item.kind === 'income') {
    await repository.createIncome({ ...common, sourceName: item.name });
  } else {
    await repository.createExpense({ ...common, merchant: item.name, paymentSource: item.paymentSource, source: 'RECURRING' });
  }
}

export type AutoAdded = { name: string; amountPaise: number; kind: 'expense' | 'income'; date: string };

let running: Promise<AutoAdded[]> | null = null;

/**
 * Adds every due occurrence of auto-add items and moves their next date on.
 * Manual items are left for the Home "due" card. Runs one at a time, so opening
 * and foregrounding the app together cannot double-add.
 */
export function processRecurring(today = dateForExpenseInput(new Date())): Promise<AutoAdded[]> {
  if (running) return running;
  running = (async () => {
    const added: AutoAdded[] = [];
    const recurring = await getRecurringRepository();
    for (const item of await recurring.list()) {
      if (!item.autoAdd) continue;
      const { due } = dueOccurrences(item.nextDate, item.startDate, item.frequency, today);
      if (due.length === 0) continue;
      let reached = item.nextDate;
      try {
        for (const date of due) {
          await addOccurrence(item, date);
          added.push({ name: item.name, amountPaise: item.amountPaise, kind: item.kind, date });
          reached = nextOccurrence(date, item.startDate, item.frequency);
        }
      } finally {
        // Move on only past what was actually added, so a failure is retried next time.
        // After a full run `reached` equals the schedule's `next`.
        if (reached !== item.nextDate) await recurring.setNextDate(item.id, reached);
      }
    }
    if (added.length) notifyEntriesChanged();
    return added;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Manual items whose next date has come. */
export function dueManualItems(items: RecurringItem[], today = dateForExpenseInput(new Date())): RecurringItem[] {
  return items.filter(item => !item.autoAdd && item.nextDate <= today).sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

/** "Jodo" on the due card: add the occurrence and move to the next one. */
export async function addDueOccurrence(item: RecurringItem): Promise<void> {
  await addOccurrence(item, item.nextDate);
  const recurring = await getRecurringRepository();
  await recurring.setNextDate(item.id, nextOccurrence(item.nextDate, item.startDate, item.frequency));
  notifyEntriesChanged();
}

/** "Skip" on the due card: nothing is added this time. */
export async function skipDueOccurrence(item: RecurringItem): Promise<void> {
  const recurring = await getRecurringRepository();
  await recurring.setNextDate(item.id, nextOccurrence(item.nextDate, item.startDate, item.frequency));
  notifyEntriesChanged();
}
