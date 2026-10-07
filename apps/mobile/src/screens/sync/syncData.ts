export type ConflictVersion = {
  source: 'local' | 'cloud';
  label: string;
  device: string;
  title: string;
  amount: string;
  detail: string;
  buttonLabel: string;
};

export const syncOverview = {
  connection: 'Demo · Sample conflict needs review',
  sanctuaryTitle: 'Sync Preview',
  sanctuaryBadge: 'Demo data',
  sanctuaryDescription: 'Sample device and cloud records preview conflict review. No sync service is connected.',
  vaultTitle: 'Sample ledger status',
  synced: 38,
  reviewNeeded: 1,
  pending: 0,
  lastSync: 'Sample timestamp · 10:14 AM',
  reconciliationTitle: 'Gentle Reconciliation',
  reconciliationSubtitle: 'Expense entry modified in two locations',
  reconciliationDescription: 'These sample entries show how edits from two locations could be reviewed. Select a version for this preview:',
  archivalNote: 'Conflict choices and archive history are previewed locally; no record is changed.',
  offlineTitle: 'Offline Resilience',
  offlineDescription: 'This preview illustrates queued entries during an offline period. No background sync runs.',
  integrity: 'Sample status · no database check has run',
  privacyTitle: 'PREVIEW MODE',
  privacyDescription: 'Sync and security actions shown here are previews; they do not connect to a cloud service.',
} as const;

export const conflictVersions: ConflictVersion[] = [
  {source: 'local', label: 'This Device (Local)', device: 'Pixel 8 · 1:30 PM', title: 'Lunch at Sharma Resta...', amount: '₹450', detail: 'Food & Dining · UPI Pay', buttonLabel: 'Keep Local Version (₹450)'},
  {source: 'cloud', label: 'Cloud Ledger', device: 'Web Portal · 1:42 PM', title: 'Lunch with Sharma & ...', amount: '₹500', detail: 'Food & Dining · HDFC NetBanking', buttonLabel: 'Keep Cloud Version (₹500)'},
];
