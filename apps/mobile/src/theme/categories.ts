import {
  Briefcase,
  Car,
  CircleEllipsis,
  Coffee,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from '../components/icons';

/** Categories offered in the add form. Voice entry must only produce names from these lists. */
export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Fuel', 'Travel', 'Shopping', 'Bills', 'Rent', 'Health', 'Entertainment', 'Other',
] as const;
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Bonus', 'Interest', 'Other'] as const;
/** Built-in payment methods; users can add their own (e.g. "HDFC Credit Card"). */
export const DEFAULT_PAYMENT_SOURCES = ['UPI', 'Cash', 'Credit Card', 'Debit Card'] as const;

export type CategoryLook = {
  Icon: LucideIcon;
  /** Icon/foreground colour. */
  color: string;
  /** Soft background behind the icon. */
  tint: string;
  /** Emoji used in the save celebration. */
  emoji: string;
};

type Rule = { match: RegExp; look: CategoryLook };

// Order matters: the first matching rule wins. Matching is by name so custom
// and legacy categories ("Food", "Food & Dining", "Petrol") still get a look.
const expenseRules: Rule[] = [
  { match: /food|dining|restaurant|lunch|dinner|swiggy|zomato/i, look: { Icon: Utensils, color: '#E8590C', tint: '#FFE8D9', emoji: '🍔' } },
  { match: /coffee|tea|chai|snack/i, look: { Icon: Coffee, color: '#9C6644', tint: '#F5E6DA', emoji: '☕' } },
  { match: /grocer/i, look: { Icon: ShoppingCart, color: '#2B8A3E', tint: '#DDF5E3', emoji: '🛒' } },
  { match: /fuel|petrol|diesel/i, look: { Icon: Fuel, color: '#C92A2A', tint: '#FFE3E3', emoji: '⛽' } },
  { match: /cab|taxi|uber|ola|auto|car/i, look: { Icon: Car, color: '#1971C2', tint: '#DCEBFB', emoji: '🚕' } },
  { match: /travel|trip|flight|train/i, look: { Icon: Plane, color: '#1C7ED6', tint: '#DCEBFB', emoji: '✈️' } },
  { match: /shop|amazon|flipkart|cloth/i, look: { Icon: ShoppingBag, color: '#C2255C', tint: '#FFE0EC', emoji: '🛍️' } },
  { match: /bill|electric|internet|recharge|wifi/i, look: { Icon: Receipt, color: '#5F3DC4', tint: '#EBE4FF', emoji: '🧾' } },
  { match: /mobile|phone/i, look: { Icon: Smartphone, color: '#5F3DC4', tint: '#EBE4FF', emoji: '📱' } },
  { match: /health|medic|doctor|pharma/i, look: { Icon: HeartPulse, color: '#E03131', tint: '#FFE3E3', emoji: '💊' } },
  { match: /rent|home|house/i, look: { Icon: House, color: '#7048E8', tint: '#EDE7FF', emoji: '🏠' } },
  { match: /movie|ott|netflix|entertain|subscri/i, look: { Icon: Film, color: '#AE3EC9', tint: '#F8E3FD', emoji: '🍿' } },
  { match: /educat|school|college|course|fee/i, look: { Icon: GraduationCap, color: '#1864AB', tint: '#DCEBFB', emoji: '📚' } },
];

const incomeRules: Rule[] = [
  { match: /salary/i, look: { Icon: Wallet, color: '#087653', tint: '#D3F9E6', emoji: '💰' } },
  { match: /freelanc/i, look: { Icon: Laptop, color: '#0B7285', tint: '#D5F5F6', emoji: '💻' } },
  { match: /business/i, look: { Icon: Briefcase, color: '#5C940D', tint: '#E9F7D0', emoji: '💼' } },
  { match: /bonus|gift/i, look: { Icon: Gift, color: '#D6336C', tint: '#FFE0EC', emoji: '🎁' } },
  { match: /interest|invest|dividend/i, look: { Icon: TrendingUp, color: '#2B8A3E', tint: '#DDF5E3', emoji: '📈' } },
];

const defaultExpense: CategoryLook = { Icon: CircleEllipsis, color: '#5C5F66', tint: '#ECEDEF', emoji: '💸' };
const defaultIncome: CategoryLook = { Icon: PiggyBank, color: '#087653', tint: '#D3F9E6', emoji: '💵' };

export function categoryLook(category: string, type: 'expense' | 'income'): CategoryLook {
  const rules = type === 'income' ? incomeRules : expenseRules;
  return rules.find(rule => rule.match.test(category))?.look ?? (type === 'income' ? defaultIncome : defaultExpense);
}
