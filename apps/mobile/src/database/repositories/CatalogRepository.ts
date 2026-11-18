import { DatabaseError } from '../errors';
import type { DatabaseAdapter, DatabaseQueryResult, DatabaseRow } from '../types';

export type ListEntryType = 'expense' | 'income';

export type CustomCategory = {
  id: string;
  name: string;
  type: ListEntryType;
  emoji: string | null;
  createdAt: string;
};

export type CustomPaymentSource = {
  id: string;
  name: string;
  createdAt: string;
};

export type Budget = {
  id: string;
  /** Category name, or TOTAL_BUDGET for all expenses. */
  category: string;
  limitPaise: number;
  createdAt: string;
};

/** Budget row that covers every expense rather than one category. */
export const TOTAL_BUDGET = '__TOTAL__';

export const MAX_NAME_LENGTH = 30;

export class ListValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListValidationError';
  }
}

type Options = { idFactory?: () => string; now?: () => Date };

function defaultIdFactory() {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new ListValidationError('Naam khaali nahi ho sakta.');
  if (trimmed.length > MAX_NAME_LENGTH) throw new ListValidationError(`Naam ${MAX_NAME_LENGTH} letters tak rakho.`);
  return trimmed;
}

function cleanEmoji(emoji: string | null | undefined): string | null {
  const trimmed = emoji?.trim();
  if (!trimmed) return null;
  // One emoji can be several code units (flags, skin tones); anything long is not an emoji.
  if (trimmed.length > 8) throw new ListValidationError('Ek hi emoji chuno.');
  return trimmed;
}

const text = (row: DatabaseRow, key: string) => String(row[key] ?? '');

/**
 * The user's own categories, payment sources and budgets. Built-in lists stay in
 * code; rows here are additions. Deletes are soft, as for all financial data.
 */
export class SQLiteCatalogRepository {
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseAdapter, options: Options = {}) {
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.now = options.now ?? (() => new Date());
  }

  async listCategories(): Promise<CustomCategory[]> {
    const rows = await this.activeRows('custom_categories');
    return rows.map(row => ({
      id: text(row, 'id'),
      name: text(row, 'name'),
      type: text(row, 'type') === 'income' ? 'income' : 'expense',
      emoji: row.emoji == null || row.emoji === '' ? null : String(row.emoji),
      createdAt: text(row, 'createdAt'),
    }));
  }

  async addCategory(input: { name: string; type: ListEntryType; emoji?: string | null }): Promise<CustomCategory> {
    const name = cleanName(input.name);
    const emoji = cleanEmoji(input.emoji);
    if (input.type !== 'expense' && input.type !== 'income') throw new ListValidationError('Type expense ya income hona chahiye.');
    const id = this.idFactory();
    const now = this.now().toISOString();
    await this.query(
      'INSERT INTO custom_categories (id, name, type, emoji, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, NULL);',
      [id, name, input.type, emoji, now, now],
    );
    return { id, name, type: input.type, emoji, createdAt: now };
  }

  removeCategory(id: string): Promise<void> {
    return this.softDelete('custom_categories', id);
  }

  async listPaymentSources(): Promise<CustomPaymentSource[]> {
    const rows = await this.activeRows('payment_sources');
    return rows.map(row => ({ id: text(row, 'id'), name: text(row, 'name'), createdAt: text(row, 'createdAt') }));
  }

  async addPaymentSource(rawName: string): Promise<CustomPaymentSource> {
    const name = cleanName(rawName);
    const id = this.idFactory();
    const now = this.now().toISOString();
    await this.query(
      'INSERT INTO payment_sources (id, name, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, NULL);',
      [id, name, now, now],
    );
    return { id, name, createdAt: now };
  }

  removePaymentSource(id: string): Promise<void> {
    return this.softDelete('payment_sources', id);
  }

  async listBudgets(): Promise<Budget[]> {
    const rows = await this.activeRows('budgets');
    return rows.map(row => ({
      id: text(row, 'id'),
      category: text(row, 'category'),
      limitPaise: Number(row.limitPaise),
      createdAt: text(row, 'createdAt'),
    }));
  }

  /** One budget per category: setting it again changes the limit. */
  async setBudget(rawCategory: string, limitPaise: number): Promise<Budget> {
    const category = rawCategory === TOTAL_BUDGET ? TOTAL_BUDGET : cleanName(rawCategory);
    if (!Number.isSafeInteger(limitPaise) || limitPaise <= 0) throw new ListValidationError('Limit ₹0 se zyada honi chahiye.');
    const now = this.now().toISOString();
    const existing = (await this.listBudgets()).find(budget => budget.category.toLowerCase() === category.toLowerCase());
    if (existing) {
      await this.query('UPDATE budgets SET limitPaise = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [limitPaise, now, existing.id]);
      return { ...existing, limitPaise };
    }
    const id = this.idFactory();
    await this.query(
      'INSERT INTO budgets (id, category, limitPaise, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, NULL);',
      [id, category, limitPaise, now, now],
    );
    return { id, category, limitPaise, createdAt: now };
  }

  removeBudget(id: string): Promise<void> {
    return this.softDelete('budgets', id);
  }

  private async activeRows(table: 'custom_categories' | 'payment_sources' | 'budgets') {
    const result = await this.query(`SELECT * FROM ${table} WHERE deletedAt IS NULL ORDER BY createdAt ASC;`);
    return result.rows;
  }

  private async softDelete(table: 'custom_categories' | 'payment_sources' | 'budgets', id: string) {
    const now = this.now().toISOString();
    await this.query(`UPDATE ${table} SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;`, [now, now, id]);
  }

  private async query(sql: string, params: (string | number | null)[] = []): Promise<DatabaseQueryResult> {
    try {
      return (await this.database.execute(sql, params)) as unknown as DatabaseQueryResult;
    } catch (error) {
      throw new DatabaseError('List storage operation failed.', error);
    }
  }
}
