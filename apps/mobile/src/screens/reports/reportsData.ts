export type ReportPeriod = 'This month' | 'Last month' | 'This year' | 'Custom';

export type SpendingCategory = {
  id: string;
  name: string;
  amount: string;
  detail: string;
  note: string;
  percentage: number;
  color: string;
  backgroundColor: string;
  icon: string;
};

export type TrendPeriod = {
  label: string;
  value: number;
};

export type PaymentChannel = {
  id: string;
  label: string;
  percentage: number;
  color: string;
};

export const reportPeriods: ReportPeriod[] = [
  'This month',
  'Last month',
  'This year',
  'Custom',
];

export const reportSummary = {
  spent: '₹39,000',
  income: '₹80,000',
  availableMargin: '₹41,000',
  comparison: '8.3% lower',
};

export const spendingCategories: SpendingCategory[] = [
  {
    id: 'rent',
    name: 'Rent & Housing',
    amount: '₹15,000',
    detail: '1 payment · 38%',
    note: 'Fixed',
    percentage: 38,
    color: '#6817D9',
    backgroundColor: '#F0E8FF',
    icon: '▦',
  },
  {
    id: 'food',
    name: 'Food & Dining',
    amount: '₹8,000',
    detail: '14 transactions · 21%',
    note: '₹1,200 saved',
    percentage: 21,
    color: '#087653',
    backgroundColor: '#E5F3EE',
    icon: '♨',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    amount: '₹5,000',
    detail: '6 purchases · 13%',
    note: 'Discretionary',
    percentage: 13,
    color: '#8A5A12',
    backgroundColor: '#FFF3E7',
    icon: '▢',
  },
  {
    id: 'travel',
    name: 'Travel & Fuel',
    amount: '₹4,000',
    detail: '9 rides · 10%',
    note: 'Within range',
    percentage: 10,
    color: '#7C7483',
    backgroundColor: '#EFEEEC',
    icon: '▣',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    amount: '₹5,000',
    detail: '3 bills · 13%',
    note: 'Automated',
    percentage: 13,
    color: '#CDBBF1',
    backgroundColor: '#F0E8FF',
    icon: 'ϟ',
  },
];

export const monthlyTrend: TrendPeriod[] = [
  { label: 'May', value: 48 },
  { label: 'Jun', value: 66 },
  { label: 'Jul', value: 54 },
  { label: 'Aug', value: 78 },
  { label: 'Sep', value: 62 },
  { label: 'Oct', value: 44 },
];

export const paymentChannels: PaymentChannel[] = [
  { id: 'upi', label: 'UPI', percentage: 58, color: '#6817D9' },
  { id: 'card', label: 'Card', percentage: 27, color: '#087653' },
  { id: 'cash', label: 'Cash', percentage: 15, color: '#F0B45F' },
];
