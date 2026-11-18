import { SQLiteCatalogRepository } from './repositories/CatalogRepository';
import { getAppDatabase } from './transactionRepository';

let repositoryPromise: Promise<SQLiteCatalogRepository> | undefined;

/** User-made categories, payment sources and budgets, on the shared app database. */
export function getCatalogRepository(): Promise<SQLiteCatalogRepository> {
  if (!repositoryPromise) {
    repositoryPromise = getAppDatabase()
      .then(instance => new SQLiteCatalogRepository(instance.database))
      .catch(error => {
        repositoryPromise = undefined;
        throw error;
      });
  }
  return repositoryPromise;
}
