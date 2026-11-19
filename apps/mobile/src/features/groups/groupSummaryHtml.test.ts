import { buildGroupSummaryHtml } from './groupSummaryHtml';
import type { GroupDetail, GroupExpense } from './types';

const group: GroupDetail = {
  id: 'g',
  title: 'Goa <Trip>',
  status: 'ACTIVE',
  inviteCode: 'code',
  myMemberId: 'a',
  myRole: 'ADMIN',
  members: [
    { id: 'a', displayName: 'Asha', phoneNumber: null, role: 'ADMIN', status: 'ACTIVE', balancePaise: 3000 },
    { id: 'b', displayName: 'Ravi', phoneNumber: null, role: 'MEMBER', status: 'ACTIVE', balancePaise: -3000 },
  ],
  transfers: [{ fromMemberId: 'b', toMemberId: 'a', amountPaise: 3000 }],
};
const expense: GroupExpense = {
  id: 'e',
  title: 'Hotel',
  amountPaise: 6000,
  categoryKey: 'stay',
  note: null,
  expenseDate: '2026-05-01T10:00:00.000Z',
  payers: [{ memberId: 'a', amountPaise: 6000 }],
  splitType: 'EQUAL' as never,
  splits: [
    { memberId: 'a', amountPaise: 3000 },
    { memberId: 'b', amountPaise: 3000 },
  ],
  createdByMemberId: 'a',
};

describe('group summary html', () => {
  it('shows totals, who pays whom, and escapes user text', () => {
    const html = buildGroupSummaryHtml(group, [expense], [], '1 May 2026');
    expect(html).toContain('Goa &lt;Trip&gt;');
    expect(html).toContain('Total spent:</b> ₹60');
    expect(html).toContain('Ravi pays Asha');
    expect(html).toContain('Hotel');
    expect(html).not.toContain('<Trip>');
  });

  it('says so when there are no expenses', () => {
    expect(buildGroupSummaryHtml({ ...group, transfers: [] }, [], [], 'x')).toContain('Everyone is settled up.');
  });
});
