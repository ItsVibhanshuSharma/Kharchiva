import { SQLiteRecurringRepository } from './repositories/RecurringRepository';
import { getAppDatabase } from './transactionRepository';

let repositoryPromise: Promise<SQLiteRecurringRepository> | undefined;

export function getRecurringRepository(): Promise<SQLiteRecurringRepository> {
  if (!repositoryPromise) {
    repositoryPromise = getAppDatabase()
      .then(instance => new SQLiteRecurringRepository(instance.database))
      .catch(error => {
        repositoryPromise = undefined;
        throw error;
      });
  }
  return repositoryPromise;
}
