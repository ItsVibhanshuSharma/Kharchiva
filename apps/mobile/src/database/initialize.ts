import { open } from '@op-engineering/op-sqlite';
import { DatabaseAdapter } from './types';
import { MigrationRunner } from './migrations/MigrationRunner';
import { migrations } from './migrations';

export interface DatabaseInstance {
  database: DatabaseAdapter;
  close(): void;
}

export async function initializeDatabase(
  database: DatabaseAdapter = open({ name: 'kharchiva.db' }) as DatabaseAdapter,
): Promise<DatabaseInstance> {
  const runner = new MigrationRunner(database, migrations);

  await runner.runPending();

  return {
    database,
    close: () => database.close(),
  };
}