export type EntryType = 'expense' | 'income';

export type RootStackParamList = {
  Welcome: undefined;
  PhoneVerification: undefined;
  OTPVerification: undefined;
  ProfileSetup: undefined;
  Home: undefined;
  Transactions: undefined;
  /** Pass `editId` to edit an existing entry of `type` instead of adding one. */
  AddExpense: { type?: EntryType; editId?: string } | undefined;
  Profile: undefined;
  Mpin: undefined;
  /** Optional initial range, YYYY-MM-DD; defaults to this month. */
  Statement: { from?: string; to?: string } | undefined;
  Budget: undefined;
  ManageLists: undefined;
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
] as const satisfies readonly RootStackRouteName[];
