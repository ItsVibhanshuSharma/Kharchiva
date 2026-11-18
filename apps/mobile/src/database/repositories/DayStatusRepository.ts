import { DatabaseError } from '../errors';
import type { DatabaseAdapter, DatabaseQueryResult } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days marked "nothing spent". Dates are India-time calendar days, YYYY-MM-DD. */
export class SQLiteDayStatusRepository {
  constructor(private readonly database: DatabaseAdapter, private readonly now: () => Date = () => new Date()) {}

  async markNoExpense(date: string): Promise<void> {
    if (!DATE_RE.test(date)) throw new Error(`Invalid date ${date}`);
    const now = this.now().toISOString();
    await this.query('INSERT OR REPLACE INTO day_status (date, status, createdAt, updatedAt) VALUES (?, ?, ?, ?);', [date, 'NO_EXPENSE', now, now]);
  }

  /** Undo, e.g. when the user adds an expense to that day after all. */
  async clear(date: string): Promise<void> {
    await this.query('DELETE FROM day_status WHERE date = ?;', [date]);
  }

  async noExpenseDays(from: string, to: string): Promise<Set<string>> {
    const result = await this.query('SELECT * FROM day_status WHERE date >= ? AND date <= ?;', [from, to]);
    return new Set(result.rows.map(row => String(row.date)));
  }

  private async query(sql: string, params: (string | number | null)[]): Promise<DatabaseQueryResult> {
    try {
      return (await this.database.execute(sql, params)) as unknown as DatabaseQueryResult;
    } catch (error) {
      throw new DatabaseError('Day status operation failed.', error);
    }
  }
}
