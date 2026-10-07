import { DatabaseError } from '../errors';
import { DatabaseAdapter } from '../types';
import { Migration } from './types';

const schemaMigrationsTable = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    appliedAt TEXT NOT NULL
  );
`;

export class MigrationRunner {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly migrations: Migration[],
  ) {}

  async runPending(): Promise<void> {
    try {
      await this.database.execute(schemaMigrationsTable);
      const result = await this.database.execute(
        'SELECT version FROM schema_migrations ORDER BY version ASC;',
      );
      const appliedVersions = new Set(
        result.rows.map((row) => Number(row.version)),
      );

      const pendingMigrations = [...this.migrations]
        .sort((left, right) => left.version - right.version)
        .filter((migration) => !appliedVersions.has(migration.version));

      for (const migration of pendingMigrations) {
        await migration.up(this.database);
        await this.database.execute(
          'INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?);',
          [migration.version, new Date().toISOString()],
        );
      }
    } catch (error) {
      throw new DatabaseError('Migration execution failed.', error);
    }
  }
}
