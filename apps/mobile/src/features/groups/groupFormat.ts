import { formatShortDate } from '../../utils/dates';
import { formatRupees } from '../../utils/money';
import type { ActivityItem, GroupMember } from './types';

export const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food', emoji: '🍽️' },
  { key: 'travel', label: 'Travel', emoji: '✈️' },
  { key: 'stay', label: 'Stay', emoji: '🏨' },
  { key: 'fuel', label: 'Fuel', emoji: '⛽' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'tickets', label: 'Tickets', emoji: '🎟️' },
  { key: 'other', label: 'Other', emoji: '🧾' },
] as const;

export function categoryEmoji(key: string | null): string {
  return EXPENSE_CATEGORIES.find(item => item.key === key)?.emoji ?? '🧾';
}

const AVATAR_TONES = [
  { background: '#EADDFC', text: '#6817D9' },
  { background: '#D3FFEE', text: '#087653' },
  { background: '#FFE7D1', text: '#B35A00' },
  { background: '#DCEBFF', text: '#1F5FBF' },
  { background: '#FFDDE3', text: '#B3314F' },
  { background: '#FFF3C4', text: '#8A6A00' },
];

/** The same name always gets the same soft colour, so people are easy to tell apart. */
export function avatarTone(name: string): { background: string; text: string } {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export type GroupStats = { totalPaise: number; youPaidPaise: number; yourShare: number };

/** Totals shown on the group hero card. */
export function groupStats(
  expenses: { amountPaise: number; payers: { memberId: string; amountPaise: number }[]; splits: { memberId: string; amountPaise: number }[] }[],
  myMemberId: string,
): GroupStats {
  let totalPaise = 0;
  let youPaidPaise = 0;
  let yourShare = 0;
  for (const expense of expenses) {
    totalPaise += expense.amountPaise;
    youPaidPaise += expense.payers.filter(p => p.memberId === myMemberId).reduce((sum, p) => sum + p.amountPaise, 0);
    yourShare += expense.splits.filter(p => p.memberId === myMemberId).reduce((sum, p) => sum + p.amountPaise, 0);
  }
  return { totalPaise, youPaidPaise, yourShare };
}

/** Expenses grouped under their day, newest day first. Input order is kept inside a day. */
export function groupByDay<T extends { expenseDate: string }>(expenses: T[]): { day: string; label: string; items: T[] }[] {
  const days = new Map<string, T[]>();
  for (const expense of expenses) {
    const day = expense.expenseDate.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), expense]);
  }
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({ day, label: formatShortDate(day), items }));
}

export function categoryLabel(key: string | null): string {
  return EXPENSE_CATEGORIES.find(item => item.key === key)?.label ?? 'Other';
}

export function memberName(members: Pick<GroupMember, 'id' | 'displayName'>[], id: string): string {
  return members.find(member => member.id === id)?.displayName ?? 'Someone';
}

export type BalanceTone = 'get' | 'owe' | 'even';

/** Wording for one person's net balance. */
export function balanceLine(paise: number): { text: string; tone: BalanceTone } {
  if (paise > 0) return { text: `gets ${formatRupees(paise)}`, tone: 'get' };
  if (paise < 0) return { text: `owes ${formatRupees(-paise)}`, tone: 'owe' };
  return { text: 'is settled up', tone: 'even' };
}

/** Same as balanceLine but written for the signed-in user ("You get ₹500"). */
export function myBalanceLine(paise: number): { text: string; tone: BalanceTone } {
  if (paise > 0) return { text: `You get ${formatRupees(paise)}`, tone: 'get' };
  if (paise < 0) return { text: `You owe ${formatRupees(-paise)}`, tone: 'owe' };
  return { text: 'Settled up', tone: 'even' };
}

export function isoToDay(iso: string): string {
  return iso.slice(0, 10);
}

export function displayDate(iso: string): string {
  return formatShortDate(isoToDay(iso));
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.';
}

type Change = { from: unknown; to: unknown };

const FIELD_NAMES: Record<string, string> = {
  title: 'name',
  amountPaise: 'amount',
  categoryKey: 'category',
  note: 'note',
  expenseDate: 'date',
  payers: 'who paid',
  splitType: 'split type',
  splits: 'split',
};

function showValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'none';
  if (field === 'amountPaise' && typeof value === 'number') return formatRupees(value);
  if (field === 'expenseDate' && typeof value === 'string') return displayDate(value);
  if (field === 'categoryKey' && typeof value === 'string') return categoryLabel(value);
  if (field === 'payers' || field === 'splits') return 'changed';
  return String(value);
}

/** One readable sentence for the activity log, e.g. `Ravi edited "Dinner": amount ₹200 → ₹300`. */
export function describeActivity(item: ActivityItem): string {
  const who = item.actorName;
  const d = item.details;
  const title = typeof d.title === 'string' ? `"${d.title}"` : '';
  const amount = typeof d.amountPaise === 'number' ? ` ${formatRupees(d.amountPaise)}` : '';
  switch (item.action) {
    case 'GROUP_CREATED':
      return `${who} created the group`;
    case 'GROUP_RENAMED':
      return `${who} renamed the group to "${String(d.to)}"`;
    case 'GROUP_CLOSED':
      return `${who} closed the group`;
    case 'GROUP_REOPENED':
      return `${who} reopened the group`;
    case 'MEMBER_ADDED':
      return `${who} added ${String(d.displayName ?? 'a member')}`;
    case 'MEMBER_JOINED':
      return `${String(d.displayName ?? who)} joined`;
    case 'MEMBER_REMOVED':
      return `${who} removed ${String(d.displayName ?? 'a member')}`;
    case 'MEMBER_LEFT':
      return `${String(d.displayName ?? who)} left the group`;
    case 'EXPENSE_ADDED':
      return `${who} added ${title}${amount}`;
    case 'EXPENSE_DELETED':
      return `${who} deleted ${title}${amount}`;
    case 'EXPENSE_EDITED': {
      const changes = (d.changes ?? {}) as Record<string, Change>;
      const parts = Object.entries(changes).map(
        ([field, change]) =>
          `${FIELD_NAMES[field] ?? field} ${showValue(field, change.from)} → ${showValue(field, change.to)}`,
      );
      return `${who} edited ${title}${parts.length ? `: ${parts.join(', ')}` : ''}`;
    }
    case 'SETTLEMENT_ADDED':
      return `${who} recorded a payment of${amount}`;
    case 'SETTLEMENT_DELETED':
      return `${who} removed a payment of${amount}`;
    default:
      return who;
  }
}
