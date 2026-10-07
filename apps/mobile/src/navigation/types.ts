export type RootStackParamList = {
  Welcome: undefined;
  PhoneVerification: undefined;
  OTPVerification: undefined;
  ProfileSetup: undefined;
  Home: undefined;
  Transactions: undefined;
  Reports: undefined;
  BudgetDetails: undefined;
  AddExpense: undefined;
  Recurring: undefined;
  Profile: undefined;
  ExportStatement: undefined;
  OfflineSync: undefined;
  Groups: undefined;
  SplitExpense: undefined;
};

export type RootStackRouteName = keyof RootStackParamList;
