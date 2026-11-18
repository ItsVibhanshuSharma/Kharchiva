import {initializeDatabase, type DatabaseInstance} from './initialize';
import type {DatabaseAdapter} from './types';
import {SQLiteTransactionRepository, type TransactionRepository} from './repositories/TransactionRepository';
let databasePromise: Promise<DatabaseInstance> | undefined;
let repositoryPromise: Promise<TransactionRepository> | undefined;
/** Lazily open the app's single local database connection on first use. */
export function getAppDatabase(): Promise<DatabaseInstance> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch(error => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}
/** The shared database connection, for small key-value settings. */
export function getDatabase(): Promise<DatabaseAdapter> {
  return getAppDatabase().then(instance => instance.database);
}
export function getTransactionRepository(): Promise<TransactionRepository> {
  if (!repositoryPromise) {
    repositoryPromise = getAppDatabase()
      .then(instance => new SQLiteTransactionRepository(instance.database))
      .catch(error => {
        repositoryPromise = undefined;
        throw error;
      });
  }
  return repositoryPromise;
}
