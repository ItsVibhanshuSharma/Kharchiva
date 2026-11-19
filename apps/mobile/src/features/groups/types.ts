import type { SplitType } from './groupMath';

export type { SplitType };
export type MemberRole = 'ADMIN' | 'MEMBER';
/** INVITED: added by phone number, has not opened the app yet. */
export type MemberStatus = 'INVITED' | 'ACTIVE' | 'REMOVED';
export type GroupStatus = 'ACTIVE' | 'CLOSED';

export type GroupMember = {
  id: string;
  displayName: string;
  phoneNumber: string | null;
  role: MemberRole;
  status: MemberStatus;
  /** Positive: the group owes this person. Negative: this person owes the group. */
  balancePaise: number;
};

export type GroupListItem = {
  id: string;
  title: string;
  status: GroupStatus;
  memberCount: number;
  myMemberId: string;
  myBalancePaise: number;
  updatedAt: string;
};

export type GroupsOverview = {
  items: GroupListItem[];
  summary: { groupCount: number; youOwePaise: number; youGetPaise: number };
};

export type Transfer = { fromMemberId: string; toMemberId: string; amountPaise: number };

export type GroupDetail = {
  id: string;
  title: string;
  status: GroupStatus;
  inviteCode: string;
  myMemberId: string;
  myRole: MemberRole;
  members: GroupMember[];
  /** Fewest payments that settle everyone. */
  transfers: Transfer[];
};

export type MemberAmount = { memberId: string; amountPaise: number };

export type GroupExpense = {
  id: string;
  title: string;
  amountPaise: number;
  categoryKey: string | null;
  note: string | null;
  /** ISO timestamp. */
  expenseDate: string;
  payers: MemberAmount[];
  splitType: SplitType;
  splits: MemberAmount[];
  createdByMemberId: string;
};

export type GroupExpenseInput = {
  title: string;
  amountPaise: number;
  categoryKey?: string;
  note?: string;
  expenseDate: string;
  payers: MemberAmount[];
  splitType: SplitType;
  /** EXACT: paise. PERCENT: basis points (10000 = 100%). EQUAL: ignored. */
  splits: { memberId: string; value?: number }[];
};

export type Settlement = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
  settledAt: string;
  createdByMemberId: string;
};

export type ActivityAction =
  | 'GROUP_CREATED'
  | 'GROUP_RENAMED'
  | 'GROUP_CLOSED'
  | 'GROUP_REOPENED'
  | 'MEMBER_ADDED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_LEFT'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_EDITED'
  | 'EXPENSE_DELETED'
  | 'SETTLEMENT_ADDED'
  | 'SETTLEMENT_DELETED';

export type ActivityItem = {
  id: string;
  action: ActivityAction;
  actorMemberId: string;
  actorName: string;
  /** Titles, amounts, and for edits a `changes` map of { field: { from, to } }. */
  details: Record<string, unknown>;
  createdAt: string;
};

export type InvitePreview = { title: string; memberCount: number; status: GroupStatus };

export type NewMember = { displayName: string; phoneNumber: string };

/**
 * Everything the Splitwise screens need from a backend. The screens only use this interface,
 * so moving from the on-phone version to a server means writing one new adapter.
 */
export interface GroupsApi {
  list(): Promise<GroupsOverview>;
  create(input: { title: string; members?: NewMember[] }): Promise<GroupDetail>;
  detail(groupId: string): Promise<GroupDetail>;
  update(groupId: string, patch: { title?: string; status?: GroupStatus }): Promise<GroupDetail>;
  remove(groupId: string): Promise<void>;

  previewInvite(code: string): Promise<InvitePreview>;
  join(code: string): Promise<GroupDetail>;

  addMember(groupId: string, member: NewMember): Promise<GroupDetail>;
  setRole(groupId: string, memberId: string, role: MemberRole): Promise<GroupDetail>;
  /** Resolves null when the caller removed themselves. */
  removeMember(groupId: string, memberId: string): Promise<GroupDetail | null>;

  listExpenses(groupId: string): Promise<GroupExpense[]>;
  createExpense(groupId: string, input: GroupExpenseInput): Promise<GroupExpense>;
  updateExpense(groupId: string, expenseId: string, input: GroupExpenseInput): Promise<GroupExpense>;
  deleteExpense(groupId: string, expenseId: string): Promise<void>;

  listSettlements(groupId: string): Promise<Settlement[]>;
  createSettlement(
    groupId: string,
    input: { fromMemberId: string; toMemberId: string; amountPaise: number },
  ): Promise<Settlement>;
  deleteSettlement(groupId: string, settlementId: string): Promise<void>;

  activity(groupId: string): Promise<ActivityItem[]>;
}

/** Message is safe to show to the user. */
export class GroupsError extends Error {}
