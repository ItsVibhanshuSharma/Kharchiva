export type EntryType = 'expense' | 'income';

export type RootStackParamList = {
  Welcome: undefined;
  PhoneVerification: undefined;
  OTPVerification: undefined;
  ProfileSetup: undefined;
  Home: undefined;
  Transactions: undefined;
  /** Pass `editId` to edit an existing entry of `type` instead of adding one. */
  AddExpense: { type?: EntryType; editId?: string; date?: string } | undefined;
  Profile: undefined;
  Mpin: undefined;
  /** Optional initial range, YYYY-MM-DD; defaults to this month. */
  Statement: { from?: string; to?: string } | undefined;
  Budget: undefined;
  ManageLists: undefined;
  Reminder: undefined;
  Recurring: undefined;
  Language: undefined;
  Splits: undefined;
  SplitPerson: { personId: string };
  /** Splitwise-style shared groups (trips, flats). */
  Groups: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; justCreated?: boolean };
  AddGroupExpense: { groupId: string; expenseId?: string };
  GroupMembers: { groupId: string };
  /** `code` is set when the screen is opened from an invite link. */
  JoinGroup: { code?: string } | undefined;
};
export type RootStackRouteName = keyof RootStackParamList;

/** Routes that are registered in the navigator for v1. */
export const ACTIVE_ROUTES = [
  'Welcome',
  'PhoneVerification',
  'OTPVerification',
  'ProfileSetup',
  'Home',
  'Transactions',
  'AddExpense',
  'Profile',
  'Mpin',
  'Statement',
  'Budget',
  'ManageLists',
  'Reminder',
  'Recurring',
  'Language',
  'Splits',
  'SplitPerson',
  'Groups',
  'CreateGroup',
  'GroupDetail',
  'AddGroupExpense',
  'GroupMembers',
  'JoinGroup',
] as const satisfies readonly RootStackRouteName[];
