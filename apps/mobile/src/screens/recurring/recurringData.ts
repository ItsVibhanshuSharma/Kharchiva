export type RecurringItem = {
  id: string;
  name: string;
  icon: string;
  iconBackground: string;
  iconColor: string;
  amount: string;
  frequency: string;
  nextOccurrence: string;
  trailingLabel: 'Scheduled' | 'Expected';
  status: 'Active';
};

export type RecurringGroup = {
  id: string;
  title: string;
  summary: string;
  items: RecurringItem[];
};

export type RecurringSummary = {
  upcomingLabel: string;
  activeCount: string;
  amount: string;
  period: string;
  renewal: string;
  featuredName: string;
  featuredDetail: string;
  featuredDate: string;
  description: string;
};

export type RecurringDataset = {
  summary: RecurringSummary;
  overviewTitle: string;
  overviewDescription: string;
  groups: RecurringGroup[];
  reminderTitle: string;
  reminderDescription: string;
};

export const recurringExpenseData: RecurringDataset = {
  summary: {
    upcomingLabel: 'UPCOMING THIS CYCLE',
    activeCount: '4 active',
    amount: '₹17,649',
    period: '/ month',
    renewal: 'Cycle renews in 28 days',
    featuredName: 'Netflix',
    featuredDetail: '₹649 due in 5 days',
    featuredDate: 'Scheduled payment on 5 Oct',
    description:
      'All recurring items are automatically tracked and balanced against your monthly budget ledger.',
  },
  overviewTitle: 'Recurring Overview',
  overviewDescription:
    'Your upcoming recurring payments and income are organized here.',
  reminderTitle: 'Manual Tracking & Reminders',
  reminderDescription:
    'Kharchiva sends gentle reminders for scheduled payments and income entries so you can stay ahead of recurring expenses manually without linking bank credentials.',
  groups: [
    {
      id: 'living',
      title: 'Fixed Living Expenses',
      summary: '₹15,000 total',
      items: [
        {
          id: 'rent',
          name: 'House Rent',
          icon: '⌂',
          iconBackground: '#F0EFEB',
          iconColor: '#6817D9',
          amount: '₹15,000',
          frequency: 'Monthly',
          nextOccurrence: 'Next: 1 Oct 2026',
          trailingLabel: 'Scheduled',
          status: 'Active',
        },
      ],
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      summary: '1 service',
      items: [
        {
          id: 'netflix',
          name: 'Netflix',
          icon: '▣',
          iconBackground: '#FCE9E9',
          iconColor: '#B9161B',
          amount: '₹649',
          frequency: 'Monthly',
          nextOccurrence: 'Next: 5 Oct 2026',
          trailingLabel: 'Scheduled',
          status: 'Active',
        },
      ],
    },
  ],
};

export const recurringIncomeData: RecurringDataset = {
  summary: {
    upcomingLabel: 'UPCOMING INCOME THIS CYCLE',
    activeCount: '2 active',
    amount: '₹30,000',
    period: '/ month',
    renewal: 'Next income expected in 8 days',
    featuredName: 'Freelance',
    featuredDetail: '₹8,000 in 8 days',
    featuredDate: 'Expected payment on 15 Oct',
    description:
      'Expected income is tracked and organized to help you plan your monthly cash flow.',
  },
  overviewTitle: 'Recurring Income Overview',
  overviewDescription:
    'Your expected recurring income is organized here.',
  reminderTitle: 'Income Tracking & Reminders',
  reminderDescription:
    'Kharchiva sends gentle reminders for expected income entries so you can track salary and freelance payments manually without linking bank credentials.',
  groups: [
    {
      id: 'salary',
      title: 'Employment Income',
      summary: '₹22,000 total',
      items: [
        {
          id: 'salary-payment',
          name: 'Salary',
          icon: '₹',
          iconBackground: '#E3F8F0',
          iconColor: '#087653',
          amount: '₹22,000',
          frequency: 'Monthly',
          nextOccurrence: 'Next: 1 Nov 2026',
          trailingLabel: 'Expected',
          status: 'Active',
        },
      ],
    },
    {
      id: 'freelance',
      title: 'Freelance Income',
      summary: '₹8,000 total',
      items: [
        {
          id: 'freelance-payment',
          name: 'Freelance income',
          icon: '↗',
          iconBackground: '#E3F8F0',
          iconColor: '#087653',
          amount: '₹8,000',
          frequency: 'Monthly',
          nextOccurrence: 'Next: 15 Oct 2026',
          trailingLabel: 'Expected',
          status: 'Active',
        },
      ],
    },
  ],
};
