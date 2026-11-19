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
  // User-made lists and optional budgets. Built-in categories and payment methods
  // stay in code; only what the user adds lives here. Entries keep the category /
  // payment source as plain text, so deleting a list item never touches history.
  createMigration(4, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        emoji TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS payment_sources (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    // A monthly limit that repeats every month. category is a category name, or
    // '__TOTAL__' for all expenses. Spent amounts are always derived from expenses.
    await database.execute(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL CHECK (length(trim(category)) > 0),
        limitPaise INTEGER NOT NULL CHECK (limitPaise > 0),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
  }),
  // Days the user explicitly said "nothing spent" (PRD §21). A day with no entries
  // and no row here is MISSING, never assumed to be zero spending.
  createMigration(5, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS day_status (
        date TEXT PRIMARY KEY NOT NULL CHECK (length(date) = 10),
        status TEXT NOT NULL CHECK (status IN ('NO_EXPENSE')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }),
  // Rent, Netflix, EMI, salary… The schedule lives here; each generated entry is a
  // normal expense/income whose clientId is "rec:<id>:<date>", so it is made once.
  createMigration(6, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS recurring_items (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        amountPaise INTEGER NOT NULL CHECK (amountPaise > 0),
        category TEXT NOT NULL CHECK (length(trim(category)) > 0),
        paymentSource TEXT,
        frequency TEXT NOT NULL CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
        startDate TEXT NOT NULL CHECK (length(startDate) = 10),
        nextDate TEXT NOT NULL CHECK (length(nextDate) = 10),
        autoAdd INTEGER NOT NULL DEFAULT 1 CHECK (autoAdd IN (0, 1)),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
  }),
  // Split bills, kept on this phone. An expense that is split stores only the user's own share
  // as its amount, so every total in the app stays correct; the bill itself lives in
  // expense_splits (shares is a JSON list of { personId, paise, percent? }, 'ME' is the user).
  // Settlements record money handed over later and never count as income or expense.
  createMigration(7, async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS split_people (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id TEXT PRIMARY KEY NOT NULL,
        expenseId TEXT NOT NULL,
        title TEXT NOT NULL,
        splitDate TEXT NOT NULL CHECK (length(splitDate) = 10),
        totalPaise INTEGER NOT NULL CHECK (totalPaise > 0),
        paidBy TEXT NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('EQUAL', 'CUSTOM', 'PERCENT')),
        shares TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_expense_splits_expenseId
      ON expense_splits (expenseId);
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS split_settlements (
        id TEXT PRIMARY KEY NOT NULL,
        personId TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('THEY_PAID_ME', 'I_PAID_THEM')),
        amountPaise INTEGER NOT NULL CHECK (amountPaise > 0),
        settledOn TEXT NOT NULL CHECK (length(settledOn) = 10),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );
    `);
  }),
];
