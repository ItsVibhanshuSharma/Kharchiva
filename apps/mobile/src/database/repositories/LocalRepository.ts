import { DatabaseError } from '../errors';
import { DatabaseAdapter, DatabaseTransaction } from '../types';

export class LocalRepository {
  constructor(protected readonly database: DatabaseAdapter) {}

  async execute<T = unknown>(
    query: string,
    params: unknown[] = [],
  ): Promise<T> {
    try {
      const result = await this.database.execute(query, params as never[]);
      return result as T;
    } catch (error) {
      throw new DatabaseError('Database query failed.', error);
    }
  }

  async transaction(
    callback: (transaction: DatabaseTransaction) => Promise<void>,
  ): Promise<void> {
    try {
      await this.database.transaction(callback);
    } catch (error) {
      throw new DatabaseError('Database transaction failed.', error);
    }
  }
}