import {
  SplitError,
  computeBalances,
  computeShares,
  simplifyDebts,
  validatePayers,
} from './groupMath';
import {
  GroupsError,
  type ActivityAction,
  type ActivityItem,
  type GroupDetail,
  type GroupExpense,
  type GroupExpenseInput,
  type GroupMember,
  type GroupsApi,
  type GroupStatus,
  type MemberRole,
  type NewMember,
  type Settlement,
} from './types';

/**
 * Groups that live only on this phone. It follows the same rules the server will
 * (who may edit, when a member can leave, how splits add up), so the screens behave
 * the same once a real backend replaces it. Nothing here is shared with other phones.
 */

const SETTING_KEY = 'groups_local_v1';
const MAX_MEMBERS = 50;

type StoredMember = Omit<GroupMember, 'balancePaise'>;
type StoredExpense = GroupExpense & { deletedAt: string | null };
type StoredSettlement = Settlement & { deletedAt: string | null };
type StoredActivity = ActivityItem;
type StoredGroup = {
  id: string;
  title: string;
  status: GroupStatus;
  inviteCode: string;
  updatedAt: string;
  deleted: boolean;
  members: StoredMember[];
  expenses: StoredExpense[];
  settlements: StoredSettlement[];
  activity: StoredActivity[];
};
type StoredState = { groups: StoredGroup[] };

export type LocalIdentity = { displayName: string; phoneNumber: string | null };

export type PersistedStore = {
  load(): Promise<string | null>;
  save(value: string): Promise<void>;
};

const getDatabase = () =>
  import('../../database/transactionRepository').then(module => module.getDatabase());

export const sqliteStore: PersistedStore = {
  async load() {
    const database = await getDatabase();
    const result = await database.execute('SELECT value FROM app_settings WHERE key = ?', [SETTING_KEY]);
    const value = result.rows[0]?.value;
    return typeof value === 'string' ? value : null;
  },
  async save(value) {
    const database = await getDatabase();
    await database.execute('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [SETTING_KEY, value]);
  },
};

function omitDeleted<T extends { deletedAt: string | null }>(row: T): Omit<T, 'deletedAt'> {
  const copy = { ...row } as Partial<T>;
  delete copy.deletedAt;
  return copy as Omit<T, 'deletedAt'>;
}

export function createLocalGroupsApi(options: {
  store: PersistedStore;
  me: () => LocalIdentity;
  now?: () => Date;
}): GroupsApi {
  const { store, me } = options;
  const now = options.now ?? (() => new Date());
  let state: StoredState | undefined;
  let counter = 0;

  const newId = (prefix: string) =>
    `${prefix}_${now().getTime().toString(36)}_${(counter++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const newCode = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  const stamp = () => now().toISOString();

  async function load(): Promise<StoredState> {
    if (state) return state;
    let parsed: StoredState = { groups: [] };
    try {
      const raw = await store.load();
      if (raw) {
        const candidate = JSON.parse(raw) as StoredState;
        if (Array.isArray(candidate.groups)) parsed = candidate;
      }
    } catch {
      // A damaged save starts empty rather than blocking the screens.
    }
    state = parsed;
    return parsed;
  }
  async function persist(): Promise<void> {
    if (state) await store.save(JSON.stringify(state));
  }

  async function findGroup(groupId: string): Promise<StoredGroup> {
    const current = await load();
    const group = current.groups.find(item => item.id === groupId && !item.deleted);
    if (!group) throw new GroupsError('Group not found');
    return group;
  }
  function myMember(group: StoredGroup): StoredMember {
    const member = group.members.find(item => item.id === 'me:' + group.id && item.status === 'ACTIVE');
    if (!member) throw new GroupsError('Group not found');
    return member;
  }
  function requireAdmin(group: StoredGroup): StoredMember {
    const member = myMember(group);
    if (member.role !== 'ADMIN') throw new GroupsError('Only a group admin can do this');
    return member;
  }
  function log(group: StoredGroup, action: ActivityAction, actor: StoredMember, details: Record<string, unknown> = {}) {
    group.activity.unshift({ id: newId('act'), action, actorMemberId: actor.id, actorName: actor.displayName, details, createdAt: stamp() });
    group.updatedAt = stamp();
  }
  function balancesOf(group: StoredGroup) {
    return computeBalances(
      group.expenses.filter(item => !item.deletedAt),
      group.settlements.filter(item => !item.deletedAt),
    );
  }
  function toDetail(group: StoredGroup): GroupDetail {
    const balances = balancesOf(group);
    const me_ = myMember(group);
    return {
      id: group.id,
      title: group.title,
      status: group.status,
      inviteCode: group.inviteCode,
      myMemberId: me_.id,
      myRole: me_.role,
      members: group.members.map(member => ({ ...member, balancePaise: balances.get(member.id) ?? 0 })),
      transfers: simplifyDebts(balances),
    };
  }
  function assertUsable(group: StoredGroup, memberIds: string[]) {
    for (const id of new Set(memberIds)) {
      const member = group.members.find(item => item.id === id);
      if (!member || member.status === 'REMOVED') throw new GroupsError('Every member must belong to this group');
    }
  }
  function present(expense: StoredExpense): GroupExpense {
    return omitDeleted(expense);
  }
  function assertCanChange(actor: StoredMember, createdBy: string) {
    if (actor.role !== 'ADMIN' && actor.id !== createdBy) {
      throw new GroupsError('Only the person who added this, or a group admin, can change it');
    }
  }
  function build(group: StoredGroup, input: GroupExpenseInput) {
    try {
      validatePayers(input.amountPaise, input.payers);
      const shares = computeShares(input.amountPaise, input.splitType, input.splits);
      assertUsable(group, [...input.payers.map(p => p.memberId), ...shares.map(s => s.memberId)]);
      return {
        title: input.title.trim(),
        amountPaise: input.amountPaise,
        categoryKey: input.categoryKey ?? null,
        note: input.note?.trim() || null,
        expenseDate: input.expenseDate,
        payers: input.payers.map(p => ({ memberId: p.memberId, amountPaise: p.amountPaise })),
        splitType: input.splitType,
        splits: shares,
      };
    } catch (error) {
      if (error instanceof SplitError) throw new GroupsError(error.message);
      throw error;
    }
  }
  function diff(before: GroupExpense, after: GroupExpense) {
    const fields = ['title', 'amountPaise', 'categoryKey', 'note', 'expenseDate', 'payers', 'splitType', 'splits'] as const;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of fields) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        changes[field] = { from: before[field], to: after[field] };
      }
    }
    return changes;
  }
  function activeCount(group: StoredGroup) {
    return group.members.filter(member => member.status !== 'REMOVED').length;
  }
  function phoneTaken(group: StoredGroup, phone: string) {
    return group.members.find(member => member.phoneNumber === phone);
  }

  const api: GroupsApi = {
    async list() {
      const current = await load();
      const items = current.groups
        .filter(group => !group.deleted)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(group => {
          const mine = myMember(group);
          return {
            id: group.id,
            title: group.title,
            status: group.status,
            memberCount: activeCount(group),
            myMemberId: mine.id,
            myBalancePaise: balancesOf(group).get(mine.id) ?? 0,
            updatedAt: group.updatedAt,
          };
        });
      let youOwePaise = 0;
      let youGetPaise = 0;
      // Completed (closed) groups stay in the list but do not count towards the dashboard.
      const open = items.filter(item => item.status === 'ACTIVE');
      for (const item of open) {
        if (item.myBalancePaise < 0) youOwePaise += -item.myBalancePaise;
        else youGetPaise += item.myBalancePaise;
      }
      return { items, summary: { groupCount: open.length, youOwePaise, youGetPaise } };
    },

    async create({ title, members = [] }) {
      const current = await load();
      const identity = me();
      const id = newId('grp');
      const creator: StoredMember = {
        id: 'me:' + id,
        displayName: identity.displayName.trim() || 'Me',
        phoneNumber: identity.phoneNumber,
        role: 'ADMIN',
        status: 'ACTIVE',
      };
      const group: StoredGroup = {
        id,
        title: title.trim(),
        status: 'ACTIVE',
        inviteCode: newCode(),
        updatedAt: stamp(),
        deleted: false,
        members: [creator],
        expenses: [],
        settlements: [],
        activity: [],
      };
      log(group, 'GROUP_CREATED', creator, { title: group.title });
      for (const invited of members) {
        if (phoneTaken(group, invited.phoneNumber)) continue;
        const member: StoredMember = {
          id: newId('mem'),
          displayName: invited.displayName.trim(),
          phoneNumber: invited.phoneNumber,
          role: 'MEMBER',
          status: 'INVITED',
        };
        group.members.push(member);
        log(group, 'MEMBER_ADDED', creator, { displayName: member.displayName });
      }
      current.groups.push(group);
      await persist();
      return toDetail(group);
    },

    async detail(groupId) {
      return toDetail(await findGroup(groupId));
    },

    async update(groupId, patch) {
      const group = await findGroup(groupId);
      const actor = requireAdmin(group);
      if (patch.title !== undefined && patch.title.trim() !== group.title) {
        const from = group.title;
        group.title = patch.title.trim();
        log(group, 'GROUP_RENAMED', actor, { from, to: group.title });
      }
      if (patch.status !== undefined && patch.status !== group.status) {
        group.status = patch.status;
        log(group, patch.status === 'CLOSED' ? 'GROUP_CLOSED' : 'GROUP_REOPENED', actor);
      }
      await persist();
      return toDetail(group);
    },

    async remove(groupId) {
      const group = await findGroup(groupId);
      requireAdmin(group);
      group.deleted = true;
      await persist();
    },

    async previewInvite(code) {
      const current = await load();
      const group = current.groups.find(item => item.inviteCode === code && !item.deleted);
      if (!group) throw new GroupsError('This invite is not available on this phone yet. Sharing between phones needs the online version.');
      return { title: group.title, memberCount: activeCount(group), status: group.status };
    },

    async join(code) {
      const current = await load();
      const group = current.groups.find(item => item.inviteCode === code && !item.deleted);
      if (!group) throw new GroupsError('This invite is not available on this phone yet. Sharing between phones needs the online version.');
      return toDetail(group);
    },

    async addMember(groupId, member) {
      const group = await findGroup(groupId);
      const actor = requireAdmin(group);
      if (group.status === 'CLOSED') throw new GroupsError('This group is closed');
      if (activeCount(group) >= MAX_MEMBERS) throw new GroupsError('This group is full');
      const prior = phoneTaken(group, member.phoneNumber);
      if (prior && prior.status !== 'REMOVED') throw new GroupsError('This phone number is already in the group');
      if (prior) {
        prior.status = 'INVITED';
        prior.displayName = member.displayName.trim();
      } else {
        group.members.push({
          id: newId('mem'),
          displayName: member.displayName.trim(),
          phoneNumber: member.phoneNumber,
          role: 'MEMBER',
          status: 'INVITED',
        });
      }
      log(group, 'MEMBER_ADDED', actor, { displayName: member.displayName.trim() });
      await persist();
      return toDetail(group);
    },

    async setRole(groupId, memberId, role: MemberRole) {
      const group = await findGroup(groupId);
      requireAdmin(group);
      const target = group.members.find(item => item.id === memberId && item.status !== 'REMOVED');
      if (!target) throw new GroupsError('Member not found');
      if (target.role === 'ADMIN' && role === 'MEMBER') {
        const others = group.members.filter(m => m.role === 'ADMIN' && m.status === 'ACTIVE' && m.id !== target.id);
        if (others.length === 0) throw new GroupsError('Make another member admin first');
      }
      target.role = role;
      await persist();
      return toDetail(group);
    },

    async removeMember(groupId, memberId) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      const target = group.members.find(item => item.id === memberId && item.status !== 'REMOVED');
      if (!target) throw new GroupsError('Member not found');
      const isSelf = target.id === actor.id;
      if (!isSelf && actor.role !== 'ADMIN') throw new GroupsError('Only a group admin can remove members');
      if ((balancesOf(group).get(target.id) ?? 0) !== 0) {
        throw new GroupsError("Settle this member's balance before removing them");
      }
      if (target.role === 'ADMIN') {
        const others = group.members.filter(m => m.role === 'ADMIN' && m.status === 'ACTIVE' && m.id !== target.id);
        if (others.length === 0) throw new GroupsError('Make another member admin first');
      }
      target.status = 'REMOVED';
      log(group, isSelf ? 'MEMBER_LEFT' : 'MEMBER_REMOVED', actor, { displayName: target.displayName });
      await persist();
      if (isSelf) {
        // On this phone "leaving" means the group disappears from the list.
        group.deleted = true;
        await persist();
        return null;
      }
      return toDetail(group);
    },

    async listExpenses(groupId) {
      const group = await findGroup(groupId);
      return group.expenses
        .filter(item => !item.deletedAt)
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.id.localeCompare(a.id))
        .map(present);
    },

    async createExpense(groupId, input) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      if (group.status === 'CLOSED') throw new GroupsError('This group is closed');
      const parts = build(group, input);
      const expense: StoredExpense = { id: newId('exp'), ...parts, createdByMemberId: actor.id, deletedAt: null };
      group.expenses.push(expense);
      log(group, 'EXPENSE_ADDED', actor, { title: expense.title, amountPaise: expense.amountPaise });
      await persist();
      return present(expense);
    },

    async updateExpense(groupId, expenseId, input) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      if (group.status === 'CLOSED') throw new GroupsError('This group is closed');
      const expense = group.expenses.find(item => item.id === expenseId && !item.deletedAt);
      if (!expense) throw new GroupsError('Expense not found');
      assertCanChange(actor, expense.createdByMemberId);
      const before = present(expense);
      Object.assign(expense, build(group, input));
      log(group, 'EXPENSE_EDITED', actor, { title: expense.title, changes: diff(before, present(expense)) });
      await persist();
      return present(expense);
    },

    async deleteExpense(groupId, expenseId) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      if (group.status === 'CLOSED') throw new GroupsError('This group is closed');
      const expense = group.expenses.find(item => item.id === expenseId && !item.deletedAt);
      if (!expense) throw new GroupsError('Expense not found');
      assertCanChange(actor, expense.createdByMemberId);
      expense.deletedAt = stamp();
      log(group, 'EXPENSE_DELETED', actor, { title: expense.title, amountPaise: expense.amountPaise });
      await persist();
    },

    async listSettlements(groupId) {
      const group = await findGroup(groupId);
      return group.settlements
        .filter(item => !item.deletedAt)
        .sort((a, b) => b.settledAt.localeCompare(a.settledAt))
        .map(omitDeleted);
    },

    async createSettlement(groupId, input) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      if (input.fromMemberId === input.toMemberId) throw new GroupsError('Payer and receiver must be different people');
      if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1) throw new GroupsError('Enter a valid amount');
      assertUsable(group, [input.fromMemberId, input.toMemberId]);
      const settlement: StoredSettlement = {
        id: newId('set'),
        ...input,
        settledAt: stamp(),
        createdByMemberId: actor.id,
        deletedAt: null,
      };
      group.settlements.push(settlement);
      log(group, 'SETTLEMENT_ADDED', actor, input);
      await persist();
      return omitDeleted(settlement);
    },

    async deleteSettlement(groupId, settlementId) {
      const group = await findGroup(groupId);
      const actor = myMember(group);
      const settlement = group.settlements.find(item => item.id === settlementId && !item.deletedAt);
      if (!settlement) throw new GroupsError('Settlement not found');
      assertCanChange(actor, settlement.createdByMemberId);
      settlement.deletedAt = stamp();
      log(group, 'SETTLEMENT_DELETED', actor, {
        fromMemberId: settlement.fromMemberId,
        toMemberId: settlement.toMemberId,
        amountPaise: settlement.amountPaise,
      });
      await persist();
    },

    async activity(groupId) {
      const group = await findGroup(groupId);
      return group.activity.slice(0, 200);
    },
  };
  return api;
}

export type { NewMember };
