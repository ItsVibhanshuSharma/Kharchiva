import { splitProblem, type Share, type SplitMethod } from '../../features/split/splitMath';
import { DatabaseError } from '../errors';
import type { DatabaseAdapter, DatabaseQueryResult, DatabaseRow } from '../types';
import { ListValidationError, MAX_NAME_LENGTH } from './CatalogRepository';

export type SplitPerson = { id: string; name: string; createdAt: string };

export type ExpenseSplit = {
  id: string;
  expenseId: string;
  /** Name shown in lists, copied from the expense when the split is saved. */
  title: string;
  /** YYYY-MM-DD of the expense. */
  date: string;
  totalPaise: number;
  /** 'ME' or a friend's id. */
  paidBy: string;
  method: SplitMethod;
  shares: Share[];
  createdAt: string;
};

export type NewExpenseSplit = Omit<ExpenseSplit, 'id' | 'createdAt'>;

export type SettlementDirection = 'THEY_PAID_ME' | 'I_PAID_THEM';

export type SplitSettlement = {
  id: string;
  personId: string;
  direction: SettlementDirection;
  amountPaise: number;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
};

export type NewSettlement = Omit<SplitSettlement, 'id' | 'createdAt'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: SplitMethod[] = ['EQUAL', 'CUSTOM', 'PERCENT'];

function defaultIdFactory() {
  return `spl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseShares(value: unknown): Share[] {
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.personId === 'string' && Number.isSafeInteger(item.paise))
      .map(item => ({
        personId: item.personId as string,
        paise: item.paise as number,
        ...(typeof item.percent === 'number' ? { percent: item.percent as number } : {}),
      }));
  } catch {
    return [];
  }
}

function toSplit(row: DatabaseRow): ExpenseSplit {
  return {
    id: String(row.id),
    expenseId: String(row.expenseId),
    title: String(row.title ?? ''),
    date: String(row.splitDate),
    totalPaise: Number(row.totalPaise),
    paidBy: String(row.paidBy),
    method: METHODS.includes(row.method as SplitMethod) ? (row.method as SplitMethod) : 'EQUAL',
    shares: parseShares(row.shares),
    createdAt: String(row.createdAt),
  };
}

/** Friends, split bills and settlements. Kept apart from expenses so totals never change by accident. */
export class SQLiteSplitRepository {
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseAdapter, options: { idFactory?: () => string; now?: () => Date } = {}) {
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.now = options.now ?? (() => new Date());
  }

  // ------------------------------------------------------------- friends

  async listPeople(): Promise<SplitPerson[]> {
    const result = await this.query('SELECT * FROM split_people WHERE deletedAt IS NULL ORDER BY createdAt ASC;');
    return result.rows.map(row => ({ id: String(row.id), name: String(row.name), createdAt: String(row.createdAt) }));
  }

  async addPerson(name: string): Promise<SplitPerson> {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) throw new ListValidationError('Naam khaali nahi ho sakta.');
    if (clean.length > MAX_NAME_LENGTH) throw new ListValidationError(`Naam ${MAX_NAME_LENGTH} letters tak rakho.`);
    const existing = await this.listPeople();
    if (existing.some(person => person.name.toLowerCase() === clean.toLowerCase())) {
      throw new ListValidationError(`"${clean}" pehle se hai.`);
    }
    const id = this.idFactory();
    const now = this.now().toISOString();
    await this.query(
      'INSERT INTO split_people (id, name, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, NULL);',
      [id, clean, now, now],
    );
    return { id, name: clean, createdAt: now };
  }

  async removePerson(id: string): Promise<void> {
    const now = this.now().toISOString();
    await this.query('UPDATE split_people SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [now, now, id]);
  }

  // -------------------------------------------------------------- splits

  async listSplits(): Promise<ExpenseSplit[]> {
    const result = await this.query('SELECT * FROM expense_splits WHERE deletedAt IS NULL ORDER BY createdAt ASC;');
    return result.rows.map(toSplit);
  }

  async getSplitForExpense(expenseId: string): Promise<ExpenseSplit | null> {
    return (await this.listSplits()).find(split => split.expenseId === expenseId) ?? null;
  }

  /** Creates the split for an expense, or replaces it when the expense already has one. */
  async saveSplit(input: NewExpenseSplit): Promise<ExpenseSplit> {
    if (!input.expenseId.trim()) throw new ListValidationError('Expense nahi mila.');
    if (!DATE_RE.test(input.date)) throw new ListValidationError('Date galat hai.');
    if (!METHODS.includes(input.method)) throw new ListValidationError('Split ka tarika galat hai.');
    const problem = splitProblem(input.totalPaise, input.paidBy, input.shares);
    if (problem) throw new ListValidationError(problem);

    const sharesJson = JSON.stringify(input.shares);
    const title = input.title.trim().slice(0, 60);
    const now = this.now().toISOString();
    const existing = await this.getSplitForExpense(input.expenseId);
    if (existing) {
      await this.query(
        'UPDATE expense_splits SET title = ?, splitDate = ?, totalPaise = ?, paidBy = ?, method = ?, shares = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;',
        [title, input.date, input.totalPaise, input.paidBy, input.method, sharesJson, now, existing.id],
      );
      return { ...input, title, id: existing.id, createdAt: existing.createdAt };
    }
    const id = this.idFactory();
    await this.query(
      'INSERT INTO expense_splits (id, expenseId, title, splitDate, totalPaise, paidBy, method, shares, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);',
      [id, input.expenseId, title, input.date, input.totalPaise, input.paidBy, input.method, sharesJson, now, now],
    );
    return { ...input, title, id, createdAt: now };
  }

  /** Used when an expense is deleted or its split is switched off. */
  async removeForExpense(expenseId: string): Promise<void> {
    const existing = await this.getSplitForExpense(expenseId);
    if (!existing) return;
    const now = this.now().toISOString();
    await this.query('UPDATE expense_splits SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [now, now, existing.id]);
  }

  // --------------------------------------------------------- settlements

  async listSettlements(): Promise<SplitSettlement[]> {
    const result = await this.query('SELECT * FROM split_settlements WHERE deletedAt IS NULL ORDER BY createdAt ASC;');
    return result.rows.map(row => ({
      id: String(row.id),
      personId: String(row.personId),
      direction: row.direction === 'I_PAID_THEM' ? 'I_PAID_THEM' : 'THEY_PAID_ME',
      amountPaise: Number(row.amountPaise),
      date: String(row.settledOn),
      createdAt: String(row.createdAt),
    }));
  }

  async addSettlement(input: NewSettlement): Promise<SplitSettlement> {
    if (!input.personId.trim()) throw new ListValidationError('Dost nahi mila.');
    if (input.direction !== 'THEY_PAID_ME' && input.direction !== 'I_PAID_THEM') throw new ListValidationError('Type galat hai.');
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) throw new ListValidationError('Amount daalo.');
    if (!DATE_RE.test(input.date)) throw new ListValidationError('Date galat hai.');
    const id = this.idFactory();
    const now = this.now().toISOString();
    await this.query(
      'INSERT INTO split_settlements (id, personId, direction, amountPaise, settledOn, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NULL);',
      [id, input.personId, input.direction, input.amountPaise, input.date, now, now],
    );
    return { ...input, id, createdAt: now };
  }

  async removeSettlement(id: string): Promise<void> {
    const now = this.now().toISOString();
    await this.query('UPDATE split_settlements SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;', [now, now, id]);
  }

  private async query(sql: string, params: (string | number | null)[] = []): Promise<DatabaseQueryResult> {
    try {
      return (await this.database.execute(sql, params)) as unknown as DatabaseQueryResult;
    } catch (error) {
      throw new DatabaseError('Split storage operation failed.', error);
    }
  }
}
