export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string;
  dateGroup: string;
  dateGroupLabel?: string;
  time: string;
  note?: string;
  paymentSource?: string;
  icon: string;
};

export const mockTransactions: Transaction[] = [
  {
    id: 'groceries-2026-09-28',
    type: 'expense',
    title: 'Supermarket Groceries',
    amount: 1240,
    category: 'Groceries',
    date: '28 Sep 2026',
    dateGroup: '2026-09-28',
    dateGroupLabel: 'Today',
    time: '10:30 AM',
    note: 'Weekly essentials',
    paymentSource: 'UPI',
    icon: '⌕',
  },
  {
    id: 'dining-2026-09-28',
    type: 'expense',
    title: 'Food & Dining',
    amount: 850,
    category: 'Food & Dining',
    date: '28 Sep 2026',
    dateGroup: '2026-09-28',
    dateGroupLabel: 'Today',
    time: '8:15 AM',
    note: 'Breakfast',
    paymentSource: 'Cash',
    icon: '☕',
  },
  {
    id: 'salary-2026-09-27',
    type: 'income',
    title: 'Salary',
    amount: 22000,
    category: 'Income',
    date: '27 Sep 2026',
    dateGroup: '2026-09-27',
    dateGroupLabel: 'Yesterday',
    time: '9:00 AM',
    paymentSource: 'Bank Transfer',
    icon: '₹',
  },
  {
    id: 'travel-2026-09-27',
    type: 'expense',
    title: 'Travel',
    amount: 600,
    category: 'Travel',
    date: '27 Sep 2026',
    dateGroup: '2026-09-27',
    time: '6:20 PM',
    paymentSource: 'UPI',
    icon: '↗',
  },
  {
    id: 'rent-2026-09-25',
    type: 'expense',
    title: 'Rent',
    amount: 15000,
    category: 'Rent',
    date: '25 Sep 2026',
    dateGroup: '2026-09-25',
    time: '11:00 AM',
    paymentSource: 'Bank Transfer',
    icon: '⌂',
  },
  {
    id: 'shopping-2026-09-25',
    type: 'expense',
    title: 'Shopping',
    amount: 1500,
    category: 'Shopping',
    date: '25 Sep 2026',
    dateGroup: '2026-09-25',
    time: '4:45 PM',
    paymentSource: 'Credit Card',
    icon: '▢',
  },
  {
    id: 'bills-2026-09-25',
    type: 'expense',
    title: 'Bills',
    amount: 2000,
    category: 'Bills & Utilities',
    date: '25 Sep 2026',
    dateGroup: '2026-09-25',
    time: '1:20 PM',
    paymentSource: 'Debit Card',
    icon: '≡',
  },
  {
    id: 'freelance-2026-09-25',
    type: 'income',
    title: 'Freelance',
    amount: 8000,
    category: 'Income',
    date: '25 Sep 2026',
    dateGroup: '2026-09-25',
    time: '10:15 AM',
    paymentSource: 'Bank Transfer',
    icon: '₹',
  },
];
