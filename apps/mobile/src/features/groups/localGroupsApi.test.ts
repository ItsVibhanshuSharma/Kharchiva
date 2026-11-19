import { createLocalGroupsApi, type PersistedStore } from './localGroupsApi';
import { GroupsError } from './types';

function memoryStore(): PersistedStore & { value: string | null } {
  return {
    value: null,
    async load() {
      return this.value;
    },
    async save(value: string) {
      this.value = value;
    },
  };
}

const phoneA = '+919800000001';
const phoneB = '+919800000002';

async function setup() {
  const store = memoryStore();
  const api = createLocalGroupsApi({
    store,
    me: () => ({ displayName: 'Asha', phoneNumber: '+919876543210' }),
  });
  const group = await api.create({
    title: 'Goa Trip',
    members: [
      { displayName: 'Ravi', phoneNumber: phoneA },
      { displayName: 'Meena', phoneNumber: phoneB },
    ],
  });
  const byName = (name: string) => group.members.find(member => member.displayName === name)!.id;
  return { api, store, group, asha: byName('Asha'), ravi: byName('Ravi'), meena: byName('Meena') };
}

describe('local groups api', () => {
  it('creates a group with me as admin and phone-invited members', async () => {
    const { group } = await setup();
    expect(group.myRole).toBe('ADMIN');
    expect(group.members.map(m => [m.displayName, m.status])).toEqual([
      ['Asha', 'ACTIVE'],
      ['Ravi', 'INVITED'],
      ['Meena', 'INVITED'],
    ]);
  });

  it('shows who owes whom after an equal split and clears it after settling', async () => {
    const { api, group, asha, ravi, meena } = await setup();
    await api.createExpense(group.id, {
      title: 'Hotel',
      amountPaise: 90000,
      expenseDate: '2026-05-01T10:00:00.000Z',
      payers: [{ memberId: asha, amountPaise: 90000 }],
      splitType: 'EQUAL' as never,
      splits: [{ memberId: asha }, { memberId: ravi }, { memberId: meena }],
    });
    let detail = await api.detail(group.id);
    expect(detail.members.find(m => m.id === asha)!.balancePaise).toBe(60000);
    expect(detail.transfers).toHaveLength(2);

    await api.createSettlement(group.id, { fromMemberId: ravi, toMemberId: asha, amountPaise: 30000 });
    await api.createSettlement(group.id, { fromMemberId: meena, toMemberId: asha, amountPaise: 30000 });
    detail = await api.detail(group.id);
    expect(detail.transfers).toEqual([]);
    expect((await api.list()).summary).toMatchObject({ youOwePaise: 0, youGetPaise: 0 });
  });

  it('feeds the dashboard summary', async () => {
    const { api, group, asha, ravi } = await setup();
    await api.createExpense(group.id, {
      title: 'Cab',
      amountPaise: 10000,
      expenseDate: '2026-05-01T10:00:00.000Z',
      payers: [{ memberId: ravi, amountPaise: 10000 }],
      splitType: 'EQUAL' as never,
      splits: [{ memberId: asha }, { memberId: ravi }],
    });
    expect((await api.list()).summary).toEqual({ groupCount: 1, youOwePaise: 5000, youGetPaise: 0 });
  });

  it('records what changed when an expense is edited', async () => {
    const { api, group, asha, ravi } = await setup();
    const input = {
      title: 'Dinner',
      amountPaise: 2000,
      expenseDate: '2026-05-01T10:00:00.000Z',
      payers: [{ memberId: asha, amountPaise: 2000 }],
      splitType: 'EQUAL' as never,
      splits: [{ memberId: asha }, { memberId: ravi }],
    };
    const created = await api.createExpense(group.id, input);
    await api.updateExpense(group.id, created.id, { ...input, title: 'Late dinner' });
    const [latest] = await api.activity(group.id);
    expect(latest.action).toBe('EXPENSE_EDITED');
    expect(latest.details.changes).toEqual({ title: { from: 'Dinner', to: 'Late dinner' } });
  });

  it('rejects shares that do not add up and blocks removing someone who is owed', async () => {
    const { api, group, asha, ravi } = await setup();
    await expect(
      api.createExpense(group.id, {
        title: 'Bad',
        amountPaise: 1000,
        expenseDate: '2026-05-01T10:00:00.000Z',
        payers: [{ memberId: asha, amountPaise: 1000 }],
        splitType: 'EXACT' as never,
        splits: [
          { memberId: asha, value: 400 },
          { memberId: ravi, value: 400 },
        ],
      }),
    ).rejects.toBeInstanceOf(GroupsError);

    await api.createExpense(group.id, {
      title: 'Ok',
      amountPaise: 1000,
      expenseDate: '2026-05-01T10:00:00.000Z',
      payers: [{ memberId: asha, amountPaise: 1000 }],
      splitType: 'EQUAL' as never,
      splits: [{ memberId: asha }, { memberId: ravi }],
    });
    await expect(api.removeMember(group.id, ravi)).rejects.toThrow('Settle');
  });

  it('keeps data after a restart', async () => {
    const { api, store, group } = await setup();
    const reopened = createLocalGroupsApi({ store, me: () => ({ displayName: 'Asha', phoneNumber: null }) });
    expect((await reopened.detail(group.id)).title).toBe('Goa Trip');
    expect((await api.list()).items).toHaveLength(1);
  });

  it('drops a completed group from the dashboard summary but keeps it in the list', async () => {
    const { api, group } = await setup();
    await api.update(group.id, { status: 'CLOSED' });
    const overview = await api.list();
    expect(overview.summary).toEqual({ groupCount: 0, youOwePaise: 0, youGetPaise: 0 });
    expect(overview.items.map(item => item.status)).toEqual(['CLOSED']);
    await api.update(group.id, { status: 'ACTIVE' });
    expect((await api.list()).summary.groupCount).toBe(1);
  });
});
