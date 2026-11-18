import type {QueryResult, Scalar} from '@op-engineering/op-sqlite';
import type {DatabaseAdapter, DatabaseTransaction} from '../types';

type Row = Record<string, Scalar>;

/** Small SQL-aware adapter used to exercise migrations and repositories in Jest. */
export class InMemoryFinancialDatabase implements DatabaseAdapter {
  readonly statements: Array<{query: string; params: Scalar[]}> = [];
  private readonly versions = new Set<number>();
  private readonly tables: Record<'expenses' | 'incomes', Row[]> = {expenses: [], incomes: []};
  /** Simple list tables, handled generically: insert with named columns, select active rows, update by id. */
  private readonly lists: Record<string, Row[]> = {custom_categories: [], payment_sources: [], budgets: []};

  async execute(query: string, params: Scalar[] = []): Promise<QueryResult> {
    this.statements.push({query, params});
    const normalized = query.replace(/\s+/g, ' ').trim();
    const lower = normalized.toLowerCase();

    if (lower.includes('select version from schema_migrations')) {
      return this.result(Array.from(this.versions).map(version => ({version})));
    }
    if (lower.startsWith('insert into schema_migrations')) {
      this.versions.add(Number(params[0]));
      return this.result([], 1);
    }
    const listInsert = /^insert into (\w+) \(([^)]+)\) values \(([^)]+)\);?$/i.exec(normalized);
    if (listInsert && listInsert[1].toLowerCase() in this.lists) {
      const columns = listInsert[2].split(',').map(column => column.trim());
      const values = listInsert[3].split(',').map(value => value.trim());
      let next = 0;
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column] = values[index] === '?' ? params[next++] ?? null : null;
      });
      this.lists[listInsert[1].toLowerCase()].push(row);
      return this.result([], 1);
    }
    const listSelect = /^select \* from (\w+) where deletedat is null order by createdat asc;?$/i.exec(normalized);
    if (listSelect && listSelect[1].toLowerCase() in this.lists) {
      const rows = this.lists[listSelect[1].toLowerCase()].filter(row => row.deletedAt == null);
      return this.result([...rows].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).map(row => ({...row})));
    }
    const listUpdate = /^update (\w+) set (.+?) where id = \? and deletedat is null;?$/i.exec(normalized);
    if (listUpdate && listUpdate[1].toLowerCase() in this.lists) {
      const assignments = listUpdate[2].split(',').map(item => item.split('=')[0].trim());
      const id = params[params.length - 1];
      const row = this.lists[listUpdate[1].toLowerCase()].find(item => item.id === id && item.deletedAt == null);
      if (!row) return this.result([], 0);
      assignments.forEach((column, index) => {row[column] = params[index] ?? null;});
      return this.result([], 1);
    }
    if (lower.startsWith('insert into expenses')) {
      const [id, clientId, amountPaise, category, paymentSource, merchant, note, source, expenseDate, createdAt, updatedAt] = params;
      this.tables.expenses.push({id, clientId, amountPaise, currency: 'INR', category, paymentSource, merchant, note, source, expenseDate, createdAt, updatedAt, deletedAt: null});
      return this.result([], 1);
    }
    if (lower.startsWith('insert into incomes')) {
      const [id, clientId, amountPaise, category, sourceName, note, incomeDate, createdAt, updatedAt] = params;
      this.tables.incomes.push({id, clientId, amountPaise, currency: 'INR', category, sourceName, note, incomeDate, createdAt, updatedAt, deletedAt: null});
      return this.result([], 1);
    }

    const updateMatch = /^update (expenses|incomes) set (.+?) where id = \? and deletedat is null;?$/i.exec(normalized);
    if (updateMatch) {
      const table = updateMatch[1].toLowerCase() as 'expenses' | 'incomes';
      const assignments = updateMatch[2].split(',').map(item => item.split('=')[0].trim());
      const id = params[params.length - 1];
      const row = this.tables[table].find(item => item.id === id && item.deletedAt === null);
      if (!row) return this.result([], 0);
      assignments.forEach((column, index) => {row[column] = params[index] ?? null;});
      return this.result([], 1);
    }

    const selectMatch = /^select \* from (expenses|incomes) where (.+?)(?: order by .+)?(?: limit \d+)?;?$/i.exec(normalized);
    if (selectMatch) {
      const table = selectMatch[1].toLowerCase() as 'expenses' | 'incomes';
      const conditions = [...selectMatch[2].matchAll(/([a-z]+)\s*(>=|<=|=)\s*\?/gi)].map(match => ({column: match[1], operator: match[2]}));
      let rows = this.tables[table].filter(row => row.deletedAt === null);
      conditions.forEach(({column, operator}, index) => {
        const value = params[index];
        rows = rows.filter(row => {
          const actual = row[column];
          if (operator === '=') return actual === value;
          if (typeof actual !== 'string' || typeof value !== 'string') return false;
          return operator === '>=' ? actual >= value : actual <= value;
        });
      });
      if (lower.includes('order by')) {
        const dateColumn = table === 'expenses' ? 'expenseDate' : 'incomeDate';
        rows = [...rows].sort((left, right) => String(right[dateColumn]).localeCompare(String(left[dateColumn])));
      }
      if (lower.includes('limit 1')) rows = rows.slice(0, 1);
      return this.result(rows.map(row => ({...row})));
    }

    return this.result([]);
  }

  async transaction(callback: (transaction: DatabaseTransaction) => Promise<void>) {
    await callback({
      execute: (query, params = []) => this.execute(query, params),
      commit: () => this.result([]),
      rollback: () => this.result([]),
    });
  }

  close() {}

  private result(rows: Row[], rowsAffected = 0): QueryResult {
    return {rows, rowsAffected};
  }
}
