import { createMigration } from './types';

export const migrations = [
  createMigration(1, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        retryCount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING',
        createdAt TEXT NOT NULL,
        lastAttemptAt TEXT,
        lastError TEXT
      );
    `);
  }),
  createMigration(2, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        clientId TEXT NOT NULL UNIQUE,
        amountPaise INTEGER NOT NULL CHECK (amountPaise > 0),
        currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
        category TEXT NOT NULL CHECK (length(trim(category)) > 0),
        paymentSource TEXT,
        merchant TEXT,
        note TEXT,
        source TEXT NOT NULL DEFAULT 'MANUAL'
          CHECK (source IN ('MANUAL', 'QUICK', 'RECURRING', 'VOICE', 'RECEIPT')),
        expenseDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_expenses_expenseDate
      ON expenses (expenseDate DESC);
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_expenses_category_expenseDate
      ON expenses (category, expenseDate DESC);
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_expenses_paymentSource_expenseDate
      ON expenses (paymentSource, expenseDate DESC);
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY NOT NULL,
        clientId TEXT NOT NULL UNIQUE,
        amountPaise INTEGER NOT NULL CHECK (amountPaise > 0),
        currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
        category TEXT NOT NULL CHECK (length(trim(category)) > 0),
        sourceName TEXT,
        note TEXT,
        incomeDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_incomes_incomeDate
      ON incomes (incomeDate DESC);
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_incomes_category_incomeDate
      ON incomes (category, incomeDate DESC);
    `);
  }),
  createMigration(3, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }),
];
