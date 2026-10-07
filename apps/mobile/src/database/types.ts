import type { DB, Scalar, Transaction } from '@op-engineering/op-sqlite';

export type DatabaseRow = Record<string, Scalar>;
export type DatabaseQueryResult = {
  rows: DatabaseRow[];
  rowsAffected: number;
};

export type DatabaseAdapter = Pick<DB, 'close' | 'execute' | 'transaction'>;
export type DatabaseTransaction = Transaction;

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Infrastructure-only sync metadata shape. Product entities may add their own
 * fields, but the local sync envelope remains intentionally minimal.
 */
export interface SyncMetadata {
  clientId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}