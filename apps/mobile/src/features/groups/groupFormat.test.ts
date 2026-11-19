import { avatarTone, balanceLine, describeActivity, groupByDay, groupStats, myBalanceLine } from './groupFormat';
import type { ActivityItem } from './types';

const base = { id: '1', actorMemberId: 'm', actorName: 'Ravi', createdAt: '2026-05-01T00:00:00Z' };

describe('group formatting', () => {
  it('words balances for a person and for the user', () => {
    expect(balanceLine(50000)).toEqual({ text: 'gets ₹500', tone: 'get' });
    expect(balanceLine(-2550)).toEqual({ text: 'owes ₹25.50', tone: 'owe' });
    expect(myBalanceLine(0)).toEqual({ text: 'Settled up', tone: 'even' });
    expect(myBalanceLine(-100).text).toBe('You owe ₹1');
  });

  it('describes an edit with old and new values', () => {
    const item: ActivityItem = {
      ...base,
      action: 'EXPENSE_EDITED',
      details: {
        title: 'Dinner',
        changes: { amountPaise: { from: 20000, to: 30000 }, title: { from: 'Dinner', to: 'Dinner' } },
      },
    };
    expect(describeActivity(item)).toBe('Ravi edited "Dinner": amount ₹200 → ₹300, name Dinner → Dinner');
  });

  it('describes additions and deletions with the amount', () => {
    expect(describeActivity({ ...base, action: 'EXPENSE_ADDED', details: { title: 'Cab', amountPaise: 45000 } })).toBe(
      'Ravi added "Cab" ₹450',
    );
    expect(describeActivity({ ...base, action: 'EXPENSE_DELETED', details: { title: 'Cab', amountPaise: 45000 } })).toBe(
      'Ravi deleted "Cab" ₹450',
    );
  });

  it('totals spend, what the user paid and their share', () => {
    const expenses = [
      { amountPaise: 9000, payers: [{ memberId: 'me', amountPaise: 9000 }], splits: [{ memberId: 'me', amountPaise: 3000 }, { memberId: 'b', amountPaise: 6000 }] },
      { amountPaise: 2000, payers: [{ memberId: 'b', amountPaise: 2000 }], splits: [{ memberId: 'me', amountPaise: 1000 }, { memberId: 'b', amountPaise: 1000 }] },
    ];
    expect(groupStats(expenses, 'me')).toEqual({ totalPaise: 11000, youPaidPaise: 9000, yourShare: 4000 });
  });

  it('groups expenses by day, newest first', () => {
    const days = groupByDay([
      { expenseDate: '2026-05-01T12:00:00.000Z', id: 'a' },
      { expenseDate: '2026-05-03T12:00:00.000Z', id: 'b' },
      { expenseDate: '2026-05-03T09:00:00.000Z', id: 'c' },
    ]);
    expect(days.map(day => [day.label, day.items.map(item => item.id)])).toEqual([
      ['3 May 2026', ['b', 'c']],
      ['1 May 2026', ['a']],
    ]);
  });

  it('gives a name the same avatar colour every time', () => {
    expect(avatarTone('Ravi')).toEqual(avatarTone('Ravi'));
  });
});
