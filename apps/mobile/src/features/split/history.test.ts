import type { ExpenseSplit, SplitSettlement } from '../../database/repositories/SplitRepository';
import { buildShareMessage, historyFor } from './history';
import { ME, balances, equalShares } from './splitMath';

const split = (id: string, expenseId: string, date: string, paidBy: string, total: number, ids: string[], title = 'Dinner'): ExpenseSplit => ({
  id, expenseId, title, date, totalPaise: total, paidBy, method: 'EQUAL', shares: equalShares(total, ids), createdAt: `${date}T10:00:00Z`,
});
const settlement = (id: string, personId: string, direction: SplitSettlement['direction'], amountPaise: number, date: string): SplitSettlement => ({
  id, personId, direction, amountPaise, date, createdAt: `${date}T12:00:00Z`,
});

const dinner = split('s1', 'e1', '2026-11-10', ME, 400000, [ME, 'a', 'b', 'c']);
const cab = split('s2', 'e2', '2026-11-12', 'a', 30000, [ME, 'a'], 'Cab');
const lunch = split('s3', 'e3', '2026-11-13', 'b', 9000, [ME, 'a', 'b'], 'Lunch');
const paidBack = settlement('t1', 'a', 'THEY_PAID_ME', 50000, '2026-11-15');
const t = (text: string, params: Record<string, string | number> = {}) => text.replace(/\{(\w+)\}/g, (_m, key: string) => String(params[key]));

describe('historyFor', () => {
  it("lists only the splits and settlements that involve the friend, newest first", () => {
    const items = historyFor('a', [dinner, cab, lunch], [paidBack, settlement('t2', 'b', 'THEY_PAID_ME', 100, '2026-11-16')]);
    expect(items.map(item => item.key)).toEqual(['t1', 's2', 's1']);
  });

  it("adds up to the same balance the balance maths gives", () => {
    const splits = [dinner, cab, lunch];
    const settlements = [paidBack];
    for (const personId of ['a', 'b', 'c']) {
      const total = historyFor(personId, splits, settlements).reduce((sum, item) => sum + item.effectPaise, 0);
      expect(total).toBe(balances(splits, settlements).get(personId) ?? 0);
    }
  });

  it('marks who paid', () => {
    const [cabItem, dinnerItem] = historyFor('a', [dinner, cab], []);
    expect(cabItem).toMatchObject({ kind: 'split', paidByMe: false, effectPaise: -15000 });
    expect(dinnerItem).toMatchObject({ kind: 'split', paidByMe: true, effectPaise: 100000 });
  });
});

describe('buildShareMessage', () => {
  it('writes a ledger and says what the friend owes', () => {
    const items = historyFor('a', [dinner], [paidBack]);
    const message = buildShareMessage('Rahul', 50000, items, t);
    expect(message.split('\n')).toEqual([
      'Namaste Rahul! Hisaab yeh hai:',
      '• Dinner (10 Nov 2026): +₹1,000',
      '• Settle up (15 Nov 2026): −₹500',
      'Total: aapko mujhe ₹500 dene hain.',
    ]);
  });

  it('says what the user owes, and when it is settled', () => {
    expect(buildShareMessage('Amit', -15000, historyFor('a', [cab], []), t).split('\n').pop()).toBe('Total: mujhe aapko ₹150 dene hain.');
    expect(buildShareMessage('Amit', 0, [], t).split('\n').pop()).toBe('Hisaab barabar hai.');
  });
});
