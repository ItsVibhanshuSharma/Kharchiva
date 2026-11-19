import type { ExpenseSplit, SplitSettlement } from '../../database/repositories/SplitRepository';
import { formatShortDate } from '../../utils/dates';
import { formatRupees } from '../../utils/money';
import { ME, myShare } from './splitMath';

/**
 * One line in a friend's ledger. `effectPaise` is how it moved the balance: positive means the friend
 * owes the user more, negative means less (or the user owes the friend). The lines add up to the balance.
 */
export type HistoryItem =
  | { kind: 'split'; key: string; date: string; createdAt: string; title: string; totalPaise: number; paidByMe: boolean; effectPaise: number }
  | { kind: 'settlement'; key: string; date: string; createdAt: string; settlementId: string; direction: SplitSettlement['direction']; effectPaise: number };

export function historyFor(personId: string, splits: ExpenseSplit[], settlements: SplitSettlement[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const split of splits) {
    if (split.paidBy === ME) {
      const theirs = split.shares.find(share => share.personId === personId);
      if (theirs) {
        items.push({ kind: 'split', key: split.id, date: split.date, createdAt: split.createdAt, title: split.title, totalPaise: split.totalPaise, paidByMe: true, effectPaise: theirs.paise });
      }
    } else if (split.paidBy === personId) {
      const mine = myShare(split.shares);
      if (mine > 0) {
        items.push({ kind: 'split', key: split.id, date: split.date, createdAt: split.createdAt, title: split.title, totalPaise: split.totalPaise, paidByMe: false, effectPaise: -mine });
      }
    }
  }
  for (const settlement of settlements) {
    if (settlement.personId !== personId) continue;
    items.push({
      kind: 'settlement',
      key: settlement.id,
      date: settlement.date,
      createdAt: settlement.createdAt,
      settlementId: settlement.id,
      direction: settlement.direction,
      effectPaise: settlement.direction === 'THEY_PAID_ME' ? -settlement.amountPaise : settlement.amountPaise,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

type Translate = (text: string, params?: Record<string, string | number>) => string;

const signed = (paise: number) => `${paise >= 0 ? '+' : '−'}${formatRupees(paise)}`;

/** Text to send a friend, oldest line first, ending with who owes whom. */
export function buildShareMessage(name: string, balancePaise: number, items: HistoryItem[], t: Translate): string {
  const lines = [t('Namaste {name}! Hisaab yeh hai:', { name })];
  for (const item of [...items].reverse()) {
    const title = item.kind === 'split' ? item.title : t('Settle up');
    lines.push(`• ${title} (${formatShortDate(item.date)}): ${signed(item.effectPaise)}`);
  }
  if (balancePaise > 0) lines.push(t('Total: aapko mujhe {amount} dene hain.', { amount: formatRupees(balancePaise) }));
  else if (balancePaise < 0) lines.push(t('Total: mujhe aapko {amount} dene hain.', { amount: formatRupees(balancePaise) }));
  else lines.push(t('Hisaab barabar hai.'));
  return lines.join('\n');
}
