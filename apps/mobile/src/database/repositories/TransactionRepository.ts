import {formatShortDate} from '../../utils/dates';
import {DatabaseError} from '../errors';
import {LocalRepository} from './LocalRepository';
import type {DatabaseQueryResult, DatabaseRow} from '../types';
import type {
  CreateExpenseInput,
  CreateIncomeInput,
  ExpenseRecord,
  IncomeRecord,
  LedgerTransaction,
  LocalTransaction,
  TransactionListFilter,
  TransactionType,
  UpdateExpenseInput,
  UpdateIncomeInput,
} from '../models/transaction';

export interface TransactionRepository {
  createExpense(input: CreateExpenseInput): Promise<ExpenseRecord>;
  createIncome(input: CreateIncomeInput): Promise<IncomeRecord>;
  listTransactions(filter?: TransactionListFilter): Promise<LedgerTransaction[]>;
  getById(id: string, type?: TransactionType): Promise<LocalTransaction | null>;
  updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseRecord>;
  updateIncome(id: string, input: UpdateIncomeInput): Promise<IncomeRecord>;
  deleteTransaction(id: string, type: TransactionType): Promise<void>;
}

export type RepositoryOptions = {
  idFactory?: () => string;
  now?: () => Date;
};

export class TransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

export class TransactionNotFoundError extends Error {
  constructor(id: string) {
    super(`Transaction ${id} was not found.`);
    this.name = 'TransactionNotFoundError';
  }
}

function defaultIdFactory() {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function requireAmount(amountPaise: number) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new TransactionValidationError('Amount must be a positive whole number of paise.');
  }
}

function requireCategory(category: string) {
  if (!category.trim()) {
    throw new TransactionValidationError('A category is required.');
  }
}

function normalizeDate(value: string | undefined, now: () => Date) {
  const date = value === undefined ? now() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TransactionValidationError('Transaction date must be a valid ISO date.');
  }
  return date.toISOString();
}

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function rowString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function rowNullableString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function rowNumber(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function dateKey(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateLabel(iso: string) {
  return formatShortDate(dateKey(iso));
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso));
}

function dateGroupLabel(iso: string) {
  const current = dateKey(iso);
  const now = new Date();
  const today = dateKey(now.toISOString());
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  if (current === today) return 'Today';
  if (current === dateKey(yesterday)) return 'Yesterday';
  return undefined;
}

function iconFor(type: TransactionType, category: string) {
  if (type === 'income') return '₹';
  if (/food|dining/i.test(category)) return '☕';
  if (/grocery/i.test(category)) return '⌕';
  if (/travel/i.test(category)) return '↗';
  if (/bill/i.test(category)) return '≡';
  if (/subscription/i.test(category)) return '▢';
  if (/rent|home/i.test(category)) return '⌂';
  return '•';
}

function toExpense(row: DatabaseRow): ExpenseRecord {
  return {
    id: rowString(row, 'id'),
    clientId: rowString(row, 'clientId'),
    currency: 'INR',
    type: 'expense',
    amountPaise: rowNumber(row, 'amountPaise'),
    category: rowString(row, 'category'),
    occurredAt: rowString(row, 'expenseDate'),
    merchant: rowNullableString(row, 'merchant'),
    paymentSource: rowNullableString(row, 'paymentSource'),
    note: rowNullableString(row, 'note'),
    source: (rowString(row, 'source') || 'MANUAL') as ExpenseRecord['source'],
    createdAt: rowString(row, 'createdAt'),
    updatedAt: rowString(row, 'updatedAt'),
    deletedAt: rowNullableString(row, 'deletedAt'),
  };
}

function toIncome(row: DatabaseRow): IncomeRecord {
  return {
    id: rowString(row, 'id'),
    clientId: rowString(row, 'clientId'),
    currency: 'INR',
    type: 'income',
    amountPaise: rowNumber(row, 'amountPaise'),
    category: rowString(row, 'category'),
    occurredAt: rowString(row, 'incomeDate'),
    sourceName: rowNullableString(row, 'sourceName'),
    note: rowNullableString(row, 'note'),
    createdAt: rowString(row, 'createdAt'),
    updatedAt: rowString(row, 'updatedAt'),
    deletedAt: rowNullableString(row, 'deletedAt'),
  };
}

function toLedgerTransaction(record: LocalTransaction): LedgerTransaction {
  const occurredAt = record.occurredAt;
  const title = record.type === 'expense'
    ? record.merchant ?? record.category
    : record.sourceName ?? record.category;
  return {
    ...record,
    title,
    paymentSource: record.type === 'expense' ? record.paymentSource : record.sourceName,
    dateLabel: dateLabel(occurredAt),
    dateGroup: dateKey(occurredAt),
    dateGroupLabel: dateGroupLabel(occurredAt),
    timeLabel: timeLabel(occurredAt),
    icon: iconFor(record.type, record.category),
  };
}

export class SQLiteTransactionRepository extends LocalRepository implements TransactionRepository {
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(database: ConstructorParameters<typeof LocalRepository>[0], options: RepositoryOptions = {}) {
    super(database);
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.now = options.now ?? (() => new Date());
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
    requireAmount(input.amountPaise);
    requireCategory(input.category);
    // A caller-chosen clientId makes the create idempotent (e.g. one row per recurring occurrence).
    if (input.clientId) {
      const existing = await this.getById(input.clientId, 'expense');
      if (existing?.type === 'expense') return existing;
    }
    const id = input.clientId ?? this.idFactory();
    const now = this.now().toISOString();
    const expenseDate = normalizeDate(input.occurredAt, this.now);
    const source = input.source ?? 'MANUAL';
    await this.query(`
      INSERT INTO expenses (
        id, clientId, amountPaise, currency, category, paymentSource,
        merchant, note, source, expenseDate, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, NULL);
    `, [id, id, input.amountPaise, input.category.trim(), optionalText(input.paymentSource), optionalText(input.merchant), optionalText(input.note), source, expenseDate, now, now]);
    return {
      id, clientId: id, currency: 'INR', type: 'expense', amountPaise: input.amountPaise, category: input.category.trim(),
      occurredAt: expenseDate, merchant: optionalText(input.merchant),
      paymentSource: optionalText(input.paymentSource), note: optionalText(input.note),
      source, createdAt: now, updatedAt: now, deletedAt: null,
    };
  }

  async createIncome(input: CreateIncomeInput): Promise<IncomeRecord> {
    requireAmount(input.amountPaise);
    requireCategory(input.category);
    if (input.clientId) {
      const existing = await this.getById(input.clientId, 'income');
      if (existing?.type === 'income') return existing;
    }
    const id = input.clientId ?? this.idFactory();
    const now = this.now().toISOString();
    const incomeDate = normalizeDate(input.occurredAt, this.now);
    await this.query(`
      INSERT INTO incomes (
        id, clientId, amountPaise, currency, category, sourceName,
        note, incomeDate, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, NULL);
    `, [id, id, input.amountPaise, input.category.trim(), optionalText(input.sourceName), optionalText(input.note), incomeDate, now, now]);
    return {
      id, clientId: id, currency: 'INR', type: 'income', amountPaise: input.amountPaise, category: input.category.trim(),
      occurredAt: incomeDate, sourceName: optionalText(input.sourceName), note: optionalText(input.note),
      createdAt: now, updatedAt: now, deletedAt: null,
    };
  }

  async listTransactions(filter: TransactionListFilter = {}): Promise<LedgerTransaction[]> {
    const [expenses, incomes] = await Promise.all([
      filter.type === 'income' ? Promise.resolve([]) : this.selectActive('expenses', 'expenseDate', filter),
      filter.type === 'expense' ? Promise.resolve([]) : this.selectActive('incomes', 'incomeDate', filter),
    ]);
    const records: LocalTransaction[] = [
      ...expenses.map(toExpense),
      ...incomes.map(toIncome),
    ];
    const search = filter.search?.trim().toLocaleLowerCase();
    return records
      .filter(record => !search || [
        record.type === 'expense' ? record.merchant : record.sourceName,
        record.category, record.note,
      ].some(value => value?.toLocaleLowerCase().includes(search)))
      .map(toLedgerTransaction)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }

  async getById(id: string, type?: TransactionType): Promise<LocalTransaction | null> {
    if (!id.trim()) throw new TransactionValidationError('Transaction ID is required.');
    if (type !== 'income') {
      const expense = await this.query(`SELECT * FROM expenses WHERE id = ? AND deletedAt IS NULL LIMIT 1;`, [id]);
      if (expense.rows[0]) return toExpense(expense.rows[0]);
    }
    if (type !== 'expense') {
      const income = await this.query(`SELECT * FROM incomes WHERE id = ? AND deletedAt IS NULL LIMIT 1;`, [id]);
      if (income.rows[0]) return toIncome(income.rows[0]);
    }
    return null;
  }

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseRecord> {
    const before = await this.getById(id, 'expense');
    if (!before || before.type !== 'expense') throw new TransactionNotFoundError(id);
    if (input.amountPaise !== undefined) requireAmount(input.amountPaise);
    if (input.category !== undefined) requireCategory(input.category);
    const updatedAt = this.now().toISOString();
    const patch = {
      amountPaise: input.amountPaise ?? before.amountPaise,
      category: input.category?.trim() ?? before.category,
      merchant: input.merchant === undefined ? before.merchant : optionalText(input.merchant),
      paymentSource: input.paymentSource === undefined ? before.paymentSource : optionalText(input.paymentSource),
      note: input.note === undefined ? before.note : optionalText(input.note),
      expenseDate: input.occurredAt === undefined ? before.occurredAt : normalizeDate(input.occurredAt, this.now),
      updatedAt,
    };
    const result = await this.query(`UPDATE expenses SET amountPaise = ?, category = ?, merchant = ?, paymentSource = ?, note = ?, expenseDate = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;`, [patch.amountPaise, patch.category, patch.merchant, patch.paymentSource, patch.note, patch.expenseDate, patch.updatedAt, id]);
    if (result.rowsAffected === 0) throw new TransactionNotFoundError(id);
    return {...before, ...patch};
  }

  async updateIncome(id: string, input: UpdateIncomeInput): Promise<IncomeRecord> {
    const before = await this.getById(id, 'income');
    if (!before || before.type !== 'income') throw new TransactionNotFoundError(id);
    if (input.amountPaise !== undefined) requireAmount(input.amountPaise);
    if (input.category !== undefined) requireCategory(input.category);
    const updatedAt = this.now().toISOString();
    const patch = {
      amountPaise: input.amountPaise ?? before.amountPaise,
      category: input.category?.trim() ?? before.category,
      sourceName: input.sourceName === undefined ? before.sourceName : optionalText(input.sourceName),
      note: input.note === undefined ? before.note : optionalText(input.note),
      incomeDate: input.occurredAt === undefined ? before.occurredAt : normalizeDate(input.occurredAt, this.now),
      updatedAt,
    };
    const result = await this.query(`UPDATE incomes SET amountPaise = ?, category = ?, sourceName = ?, note = ?, incomeDate = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;`, [patch.amountPaise, patch.category, patch.sourceName, patch.note, patch.incomeDate, patch.updatedAt, id]);
    if (result.rowsAffected === 0) throw new TransactionNotFoundError(id);
    return {...before, ...patch};
  }

  async deleteTransaction(id: string, type: TransactionType): Promise<void> {
    if (!id.trim()) throw new TransactionValidationError('Transaction ID is required.');
    const table = type === 'expense' ? 'expenses' : 'incomes';
    const deletedAt = this.now().toISOString();
    const result = await this.query(`UPDATE ${table} SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;`, [deletedAt, deletedAt, id]);
    if (result.rowsAffected === 0) throw new TransactionNotFoundError(id);
  }

  private async selectActive(table: 'expenses' | 'incomes', dateColumn: 'expenseDate' | 'incomeDate', filter: TransactionListFilter) {
    const conditions = ['deletedAt IS NULL'];
    const values: (string | number | null)[] = [];
    if (filter.from) { conditions.push(`${dateColumn} >= ?`); values.push(filter.from); }
    if (filter.to) { conditions.push(`${dateColumn} <= ?`); values.push(filter.to); }
    if (filter.category) { conditions.push('category = ?'); values.push(filter.category); }
    const result = await this.query(`SELECT * FROM ${table} WHERE ${conditions.join(' AND ')} ORDER BY ${dateColumn} DESC;`, values);
    return result.rows;
  }

  private async query(sql: string, params: (string | number | null)[] = []) {
    try {
      return await this.execute<DatabaseQueryResult>(sql, params);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Transaction storage operation failed.', error);
    }
  }
}
