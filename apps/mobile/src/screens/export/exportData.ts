export type ExportCategory = {
  id: 'transactions' | 'budgets' | 'recurring';
  title: string;
  detail: string;
  count: string;
};

export type ExportRange = {
  id: 'month' | 'quarter' | 'financial-year';
  label: string;
  dateLabel: string;
};

export type ExportFormat = {
  id: 'csv' | 'xlsx' | 'pdf';
  label: string;
  extension: string;
  detail: string;
  icon: string;
};

export const exportCategories: ExportCategory[] = [
  {id: 'transactions', title: 'Transactions', detail: 'Income and expenses', count: '128 records'},
  {id: 'budgets', title: 'Budgets', detail: 'Monthly limits and totals', count: '6 records'},
  {id: 'recurring', title: 'Recurring', detail: 'Scheduled income and expenses', count: '4 records'},
];

export const exportRanges: ExportRange[] = [
  {id: 'month', label: 'This month', dateLabel: 'September 2026'},
  {id: 'quarter', label: 'Last 3 months', dateLabel: 'July–September 2026'},
  {id: 'financial-year', label: 'FY 2026–27', dateLabel: 'April 2026–March 2027'},
];

export const exportFormats: ExportFormat[] = [
  {id: 'csv', label: 'CSV', extension: '.csv', detail: 'Universal tabular data.', icon: '▤'},
  {id: 'xlsx', label: 'XLSX', extension: '.xlsx', detail: 'Microsoft Excel sheet.', icon: '▦'},
  {id: 'pdf', label: 'PDF', extension: '.pdf', detail: 'Formatted document.', icon: '▧'},
];

export const exportStatementInfo = {
  badge: 'DATA OWNERSHIP & PORTABILITY',
  title: 'Export your data',
  localTitle: 'Export Preview',
  localDescription: 'Choose categories, a date range, and a format. Statement generation is not connected in this preview.',
  fileSize: 'Approx. 24 KB file size',
} as const;
