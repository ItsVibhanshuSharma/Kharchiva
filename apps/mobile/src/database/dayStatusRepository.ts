import { SQLiteDayStatusRepository } from './repositories/DayStatusRepository';
import { getAppDatabase } from './transactionRepository';

let repositoryPromise: Promise<SQLiteDayStatusRepository> | undefined;

export function getDayStatusRepository(): Promise<SQLiteDayStatusRepository> {
  if (!repositoryPromise) {
    repositoryPromise = getAppDatabase()
      .then(instance => new SQLiteDayStatusRepository(instance.database))
      .catch(error => {
        repositoryPromise = undefined;
        throw error;
      });
  }
  return repositoryPromise;
}
