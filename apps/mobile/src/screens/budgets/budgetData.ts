export type BudgetStatus = 'near' | 'healthy' | 'completed';

export type BudgetCategory = {
  id: string;
  name: string;
  budgetAmount: string;
  spentAmount: string;
  remainingAmount: string;
  progress: number;
  progressLabel: string;
  progressColor: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  status?: BudgetStatus;
  statusLabel?: string;
  footerIcon?: string;
  footerLeft: string;
  footerRight: string;
};

export const budgetOverview = {
  period: 'Sep 2026 · 6 days left',
  spent: '₹34,800',
  total: '₹40,000',
  remaining: '₹5,200 remaining',
  used: '87% used',
  pace: '₹866/day',
  daysLeft: '6 days of September.',
};

export const budgetCategories: BudgetCategory[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    budgetAmount: '₹10,000',
    spentAmount: '₹8,000',
    remainingAmount: '₹2,000',
    progress: 80,
    progressLabel: '80% used',
    progressColor: '#6817D9',
    icon: '♨',
    iconColor: '#80500A',
    iconBackground: '#FFE1BD',
    footerIcon: '•',
    footerLeft: 'Avg ₹266/day',
    footerRight: 'Within comfortable limits',
  },
  {
    id: 'shopping',
    name: 'Shopping & Essentials',
    budgetAmount: '₹5,500',
    spentAmount: '₹5,000',
    remainingAmount: '₹500',
    progress: 91,
    progressLabel: '91% used',
    progressColor: '#FFB84D',
    icon: '♙',
    iconColor: '#6817D9',
    iconBackground: '#EADDFC',
    status: 'near',
    statusLabel: 'NEAR LIMIT',
    footerIcon: 'ⓘ',
    footerLeft: '6 days remaining',
    footerRight: 'Slow discretionary buys',
  },
  {
    id: 'travel',
    name: 'Travel & Commute',
    budgetAmount: '₹6,000',
    spentAmount: '₹4,000',
    remainingAmount: '₹2,000',
    progress: 66,
    progressLabel: '66% allocated',
    progressColor: '#087653',
    icon: '▣',
    iconColor: '#087653',
    iconBackground: '#65EAC0',
    status: 'healthy',
    statusLabel: 'HEALTHY',
    footerIcon: '•',
    footerLeft: '66% allocated',
    footerRight: '₹333/day buffer',
  },
  {
    id: 'rent',
    name: 'Rent & Housing',
    budgetAmount: '₹15,000',
    spentAmount: '₹15,000',
    remainingAmount: '₹0',
    progress: 100,
    progressLabel: '100% used',
    progressColor: '#817B89',
    icon: '⌂',
    iconColor: '#292631',
    iconBackground: '#E9E8E5',
    status: 'completed',
    statusLabel: 'COMPLETED',
    footerIcon: '☑',
    footerLeft: 'Paid on 1st Sep',
    footerRight: 'Zero variance',
  },
];

export const budgetReflections = {
  monthlyTitle: 'MONTHLY REFLECTION',
  monthlyText:
    'Last month you stayed ₹1,400 under budget. At your current pace, you will finish September comfortably within your ₹40,000 target.',
  habitTitle: 'MONTHLY HABIT',
  habitText:
    'You stayed ₹1,400 under budget last month. Your disciplined pacing keeps your discretionary expenses completely in control.',
};
