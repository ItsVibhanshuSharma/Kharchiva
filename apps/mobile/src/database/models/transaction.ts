export type TransactionType = 'expense' | 'income';

export interface TransactionFields {
  id: string;
  clientId: string;
  currency: 'INR';
  amountPaise: number;
  category: string;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseRecord extends TransactionFields {
  type: 'expense';
  merchant: string | null;
  paymentSource: string | null;
  source: 'MANUAL' | 'QUICK' | 'RECURRING' | 'VOICE' | 'RECEIPT';
}

export interface IncomeRecord extends TransactionFields {
  type: 'income';
  sourceName: string | null;
}

export type LocalTransaction = ExpenseRecord | IncomeRecord;

export type CreateExpenseInput = {
  amountPaise: number;
  category: string;
  /** How the entry was captured. Defaults to MANUAL. */
  source?: ExpenseRecord['source'];
  /** Stable id for idempotent creates; a second create with it returns the first row. */
  clientId?: string;
  occurredAt?: string;
  merchant?: string | null;
  paymentSource?: string | null;
  note?: string | null;
};

export type CreateIncomeInput = {
  amountPaise: number;
  category: string;
  clientId?: string;
  occurredAt?: string;
  sourceName?: string | null;
  note?: string | null;
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'occurredAt'>> & {
  occurredAt?: string;
};

export type UpdateIncomeInput = Partial<Omit<CreateIncomeInput, 'occurredAt'>> & {
  occurredAt?: string;
};

export type TransactionListFilter = {
  type?: TransactionType;
  from?: string;
  to?: string;
  category?: string;
  search?: string;
};

export interface LedgerTransaction extends TransactionFields {
  type: TransactionType;
  title: string;
  paymentSource: string | null;
  dateLabel: string;
  dateGroup: string;
  dateGroupLabel?: string;
  timeLabel: string;
  icon: string;
}
