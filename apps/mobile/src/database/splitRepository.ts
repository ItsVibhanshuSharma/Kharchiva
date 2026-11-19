import { SQLiteSplitRepository } from './repositories/SplitRepository';
import { getAppDatabase } from './transactionRepository';

let repositoryPromise: Promise<SQLiteSplitRepository> | undefined;

export function getSplitRepository(): Promise<SQLiteSplitRepository> {
  if (!repositoryPromise) {
    repositoryPromise = getAppDatabase()
      .then(instance => new SQLiteSplitRepository(instance.database))
      .catch(error => {
        repositoryPromise = undefined;
        throw error;
      });
  }
  return repositoryPromise;
}
