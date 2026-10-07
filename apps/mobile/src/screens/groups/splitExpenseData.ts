export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';

export type SplitParticipant = {
  id: string;
  name: string;
  initials: string;
  tone: 'violet' | 'green' | 'amber' | 'blue';
  isCurrentUser?: boolean;
};

export const splitExpenseMock = {
  groupName: 'Goa Retreat',
  amount: '2400',
  title: 'Dinner at Fisherman’s Wharf',
  category: 'Food & Dining',
  note: 'Seafood dinner · includes drinks',
  payerId: 'vibhanshu',
} as const;

export const splitCategories = ['Food & Dining', 'Travel', 'Groceries'] as const;

export const splitParticipants: SplitParticipant[] = [
  {id: 'vibhanshu', name: 'Vibhanshu Sharma', initials: 'VS', tone: 'violet', isCurrentUser: true},
  {id: 'rahul', name: 'Rahul Verma', initials: 'RV', tone: 'green'},
  {id: 'aman', name: 'Aman Gupta', initials: 'AG', tone: 'amber'},
  {id: 'priya', name: 'Priya Nair', initials: 'PN', tone: 'blue'},
];

export const splitModes: {id: SplitMode; label: string}[] = [
  {id: 'equal', label: 'Equal (=)'},
  {id: 'exact', label: 'Exact (₹)'},
  {id: 'percent', label: 'Percent (%)'},
  {id: 'shares', label: 'Shares (÷)'},
];
