import type { DatabaseAdapter } from '../types';

export interface Migration {
  version: number;
  up(database: DatabaseAdapter): Promise<void>;
}

export function createMigration(
  version: number,
  up: (database: DatabaseAdapter) => Promise<void>,
): Migration {
  return { version, up };
}
