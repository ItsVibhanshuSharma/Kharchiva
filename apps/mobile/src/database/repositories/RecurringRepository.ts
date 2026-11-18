import { DatabaseError } from '../errors';
import type { DatabaseAdapter, DatabaseQueryResult, DatabaseRow } from '../types';
import { ListValidationError, MAX_NAME_LENGTH } from './CatalogRepository';

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurringItem = {
  id: string;
  kind: 'expense' | 'income';
  name: string;
  amountPaise: number;
  category: string;
  paymentSource: string | null;
  frequency: RecurringFrequency;
  /** First occurrence; monthly/yearly items repeat on this day. YYYY-MM-DD. */
  startDate: string;
  /** Next occurrence not yet added or skipped. YYYY-MM-DD. */
  nextDate: string;
  /** Add the entry by itself on the due date; otherwise ask on Home. */
  autoAdd: boolean;
  createdAt: string;
};

export type NewRecurringItem = Omit<RecurringItem, 'id' | 'nextDate' | 'createdAt'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES: RecurringFrequency[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];

function defaultIdFactory() {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function validate(input: Partial<NewRecurringItem>) {
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ListValidationError('Naam likho, jaise Rent ya Netflix.');
    if (name.length > MAX_NAME_LENGTH) throw new ListValidationError(`Naam ${MAX_NAME_LENGTH} letters tak rakho.`);
  }
  if (input.amountPaise !== undefined && (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0)) {
    throw new ListValidationError('Amount ₹0 se zyada hona chahiye.');
  }
  if (input.category !== undefined && !input.category.trim()) throw new ListValidationError('Category chuno.');
  if (input.kind !== undefined && input.kind !== 'expense' && input.kind !== 'income') throw new ListValidationError('Type galat hai.');
  if (input.frequency !== undefined && !FREQUENCIES.includes(input.frequency)) throw new ListValidationError('Frequency galat hai.');
  if (input.startDate !== undefined && !DATE_RE.test(input.startDate)) throw new ListValidationError('Date galat hai.');
}

function toItem(row: DatabaseRow): RecurringItem {
  return {
    id: String(row.id),
    kind: row.kind === 'income' ? 'income' : 'expense',
    name: String(row.name),
    amountPaise: Number(row.amountPaise),
    category: String(row.category),
    paymentSource: row.paymentSource == null || row.paymentSource === '' ? null : String(row.paymentSource),
    frequency: String(row.frequency) as RecurringFrequency,
    startDate: String(row.startDate),
    nextDate: String(row.nextDate),
    autoAdd: Number(row.autoAdd) === 1,
    createdAt: String(row.createdAt),
  };
}

export class SQLiteRecurringRepository {
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseAdapter, options: { idFactory?: () => string; now?: () => Date } = {}) {
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.now = options.now ?? (() => new Date());
  }

  async list(): Promise<RecurringItem[]> {
    const result = await this.query('SELECT * FROM recurring_items WHERE deletedAt IS NULL ORDER BY createdAt ASC;');
    return result.rows.map(toItem);
  }

  async add(input: NewRecurringItem): Promise<RecurringItem> {
    validate(input);
    const id = this.idFactory();
    const now = this.now().toISOString();
    const item: RecurringItem = {
      ...input,
      id,
      name: input.name.trim(),
      category: input.category.trim(),
      paymentSource: input.paymentSource?.trim() || null,
      nextDate: input.startDate,
      createdAt: now,
    };
    await this.query(
      'INSERT INTO recurring_items (id, kind, name, amountPaise, category, paymentSource, frequency, startDate, nextDate, autoAdd, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);',
      [id, item.kind, item.name, item.amountPaise, item.category, item.paymentSource, item.frequency, item.startDate, item.nextDate, item.autoAdd ? 1 : 0, now, now],
    );
    return item;
  }

  /** Name, amount, category, payment and auto-add can change; the schedule stays. */
  async update(id: string, changes: Partial<Pick<RecurringItem, 'name' | 'amountPaise' | 'category' | 'paymentSource' | 'autoAdd'>>): Promise<void> {
    validate(changes);
    const columns: string[] = [];
    const values: (string | number | null)[] = [];
    if (changes.name !== undefined) { columns.push('name = ?'); values.push(changes.name.trim()); }
    if (changes.amountPaise !== undefined) { columns.push('amountPaise = ?'); values.push(changes.amountPaise); }
    if (changes.category !== undefined) { columns.push('category = ?'); values.push(changes.category.trim()); }
    if (changes.paymentSource !== undefined) { columns.push('paymentSource = ?'); values.push(changes.paymentSource?.trim() || null); }
    if (changes.autoAdd !== undefined) { columns.push('autoAdd = ?'); values.push(changes.autoAdd ? 1 : 0); }
    if (columns.length === 0) return;
    columns.push('updatedAt = ?');
    values.push(this.now().toISOString(), id);
    await this.query(`UPDATE recurring_items SET ${columns.join(', ')} WHERE id = ? AND deletedAt IS NULL;`, values);
  }

  async setNextDate(id: string, nextDate: string): Promise<void> {
    if (!DATE_RE.test(nextDate)) throw new ListValidationError('Date galat hai.');
    await this.query('UPDATE recurring_items SET nextDate = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [nextDate, this.now().toISOString(), id]);
  }

  async remove(id: string): Promise<void> {
    const now = this.now().toISOString();
    await this.query('UPDATE recurring_items SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [now, now, id]);
  }

  private async query(sql: string, params: (string | number | null)[] = []): Promise<DatabaseQueryResult> {
    try {
      return (await this.database.execute(sql, params)) as unknown as DatabaseQueryResult;
    } catch (error) {
      throw new DatabaseError('Recurring storage operation failed.', error);
    }
  }
}
