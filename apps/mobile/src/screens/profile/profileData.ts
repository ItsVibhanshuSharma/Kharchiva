export type ProfileRoute = 'BudgetDetails' | 'Recurring' | 'Transactions' | 'ExportStatement' | 'OfflineSync' | 'Groups';

export type ProfileSettingsRow = {
  id: string;
  title: string;
  detail?: string;
  icon: string;
  iconTone?: 'violet' | 'green' | 'amber' | 'gray' | 'red';
  badge?: string;
  badgeTone?: 'violet' | 'green' | 'amber' | 'red';
  statusDot?: boolean;
  time?: string;
  toggle?: boolean;
  route?: ProfileRoute;
  trailingIcon?: string;
  destructive?: boolean;
};

export type ProfileSettingsSection = {
  id: string;
  heading: string;
  rows: ProfileSettingsRow[];
};

export const profileData = {
  name: 'Vibhanshu Sharma',
  email: 'vibhanshu@example.com',
  phone: '+91 98765 43210',
  memberSince: 'Member since August 2024',
  securityMessage: '',
  footerTitle: 'Mindful Financial Rhythm',
  footerDetail: 'Kharchiva v2.4.1 (Build 890) · Designed for Clarity',
} as const;

export const profileSections: ProfileSettingsSection[] = [
  {
    id: 'money',
    heading: 'MONEY & MANAGEMENT',
    rows: [
      {
        id: 'categories',
        title: 'Categories & Rules',
        detail: 'Auto-sorting, custom tag...',
        icon: '♧',
        iconTone: 'violet',
        badge: '8 active',
      },
      {
        id: 'sources',
        title: 'Payment Sources & Tags',
        detail: 'UPI, Cash, Credit Card, Debit Card, ...',
        icon: '♜',
        iconTone: 'amber',
      },
      {
        id: 'budgets',
        title: 'Budgets & Limits',
        detail: '₹40,000 monthly target · On track',
        icon: '◷',
        iconTone: 'green',
        statusDot: true,
        route: 'BudgetDetails',
      },
      {
        id: 'recurring',
        title: 'Recurring Commitments',
        detail: '4 active subscriptions · Next due in ...',
        icon: '▧',
        iconTone: 'violet',
        route: 'Recurring',
      },
    ],
  },
  {
    id: 'shared',
    heading: 'SHARED & COLLABORATION',
    rows: [
      {
        id: 'groups',
        title: 'Groups & Split Expenses',
        detail: 'Balances ...',
        icon: '♧',
        iconTone: 'violet',
        route: 'Groups',
        badge: '• Goa Trip: You owe ₹1,250',
        badgeTone: 'red',
      },
    ],
  },
  {
    id: 'notifications',
    heading: 'NOTIFICATIONS & REMINDERS',
    rows: [
      {
        id: 'notification-center',
        title: 'Notification Center',
        detail: 'Ledger updates and export ...',
        icon: '♧',
        iconTone: 'gray',
        badge: '2 new',
        badgeTone: 'violet',
      },
      {
        id: 'daily-reminder',
        title: 'Daily Evening Reminder',
        detail: 'Gentle prompt to log offline cas...',
        icon: '◷',
        iconTone: 'gray',
        time: '8:30 PM',
        toggle: true,
      },
      {
        id: 'insights',
        title: 'Non-Judgmental Insights',
        detail: 'Alert before auto-debits & budg...',
        icon: '☏',
        iconTone: 'gray',
        toggle: true,
      },
    ],
  },
  {
    id: 'security',
    heading: 'DATA PORTABILITY & SECURITY',
    rows: [
      {
        id: 'export',
        title: 'Export Statement',
        detail: 'Generate verified CSV / PDF archives',
        icon: '↓',
        iconTone: 'gray',
        route: 'ExportStatement',
        trailingIcon: '⇩',
      },
      {
        id: 'backup',
        title: 'Cloud Backup & Sync',
        detail: 'Your financial records...',
        icon: '↻',
        iconTone: 'gray',
        route: 'OfflineSync',
        badge: 'Synced just now',
        badgeTone: 'green',
      },
      {
        id: 'biometrics',
        title: 'App Security & Biometrics',
        detail: 'Face ID / Fingerprint lock',
        icon: '◎',
        iconTone: 'gray',
        badge: 'Enabled',
        badgeTone: 'green',
      },
    ],
  },
];

export const profileAccountActions: ProfileSettingsRow[] = [
  {
    id: 'logout',
    title: 'Log Out',
    icon: '⇥',
    iconTone: 'gray',
  },
  {
    id: 'delete-account',
    title: 'Delete Account & Wipe Data',
    icon: '☒',
    iconTone: 'red',
    destructive: true,
  },
];
