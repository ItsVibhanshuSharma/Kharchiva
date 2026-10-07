import type { QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { DatabaseError } from './errors';
import { initializeDatabase } from './initialize';
import { MigrationRunner } from './migrations/MigrationRunner';
import { createMigration } from './migrations/types';
import { LocalRepository } from './repositories/LocalRepository';
import { DatabaseAdapter, DatabaseTransaction } from './types';

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    transaction: jest.fn(async () => undefined),
    close: jest.fn(),
  })),
}));

class InMemoryDatabase implements DatabaseAdapter {
  public executed: Array<{ query: string; params: unknown[] }> = [];
  public transactions: Array<string[]> = [];
  public readonly queries: Array<{ query: string; params: unknown[] }> = [];
  public openResult = true;
  public shouldFail = false;
  private readonly appliedVersions = new Set<number>();

  async execute(
    query: string,
    params: Scalar[] = [],
  ): Promise<QueryResult> {
    this.executed.push({ query, params });
    this.queries.push({ query, params });

    if (this.shouldFail) {
      throw new Error('database failure');
    }

    if (query.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) {
      return { rows: [], rowsAffected: 0 };
    }

    if (query.includes('SELECT version FROM schema_migrations')) {
      return {
        rows: [...this.appliedVersions].map((version) => ({ version })),
        rowsAffected: 0,
      };
    }

    if (query.includes('INSERT INTO schema_migrations')) {
      const [version] = params as [number];
      this.appliedVersions.add(version);
    }

    return { rows: [], rowsAffected: 0 };
  }

  async transaction(
    callback: (transaction: DatabaseTransaction) => Promise<void>,
  ): Promise<void> {
    this.transactions.push(['BEGIN']);
    const transaction: DatabaseTransaction = {
      execute: async (query: string, params: Scalar[] = []) =>
        this.execute(query, params),
      commit: () => ({ rows: [], rowsAffected: 0 }),
      rollback: () => ({ rows: [], rowsAffected: 0 }),
    };
    await callback(transaction);
    this.transactions.push(['COMMIT']);
  }

  close(): void {
    this.openResult = false;
  }
}

describe('SQLite foundation', () => {
  it('initializes the database and runs pending migrations', async () => {
    const database = new InMemoryDatabase();
    new MigrationRunner(database, [
      createMigration(1, async (connection) => {
        await connection.execute(`CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL
        );`);
      }),
    ]);

    await initializeDatabase(database);

    expect(database.executed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ query: expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations') }),
        expect.objectContaining({ query: expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_queue') }),
      ]),
    );
  });

  it('does not rerun completed migrations', async () => {
    const database = new InMemoryDatabase();
    let migrationExecuted = false;
    const migration = createMigration(1, async () => {
      migrationExecuted = true;
    });
    const runner = new MigrationRunner(database, [migration]);

    await database.execute(
      'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL);',
    );
    await database.execute(
      'INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?);',
      [1, new Date().toISOString()],
    );

    await runner.runPending();

    expect(migrationExecuted).toBe(false);
    expect(database.executed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'),
        }),
        expect.objectContaining({
          query: 'SELECT version FROM schema_migrations ORDER BY version ASC;',
        }),
      ]),
    );
  });

  it('executes migrations in version order', async () => {
    const database = new InMemoryDatabase();
    const executions: number[] = [];
    const runner = new MigrationRunner(database, [
      createMigration(2, async () => { executions.push(2); }),
      createMigration(1, async () => { executions.push(1); }),
    ]);

    await runner.runPending();

    expect(executions).toEqual([1, 2]);
  });

  it('provides a minimal repository wrapper', async () => {
    const database = new InMemoryDatabase();
    const repository = new LocalRepository(database);

    await repository.execute('SELECT 1');

    expect(database.executed).toEqual([
      expect.objectContaining({ query: 'SELECT 1', params: [] }),
    ]);
  });

  it('wraps database errors in a lightweight database-specific error', async () => {
    const database = new InMemoryDatabase();
    database.shouldFail = true;

    await expect(database.execute('SELECT 1')).rejects.toThrow('database failure');

    const repository = new LocalRepository(database);
    await expect(repository.execute('SELECT 1')).rejects.toBeInstanceOf(DatabaseError);
  });
});
