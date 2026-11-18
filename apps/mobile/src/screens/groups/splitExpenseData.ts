export type SplitMode = 'equal' | 'exact' | 'percent';

export type ParticipantTone = 'violet' | 'green' | 'amber' | 'neutral';

export type SplitParticipant = {
  id: string;
  name: string;
  initials: string;
  tone: ParticipantTone;
  isCurrentUser?: boolean;
};

export const splitExpenseMock = {
  title: 'Dinner at Fisherman’s Wharf',
  amount: '2400',
  date: '12 Sep 2026',
  groupName: 'Goa Beach Retreat',
  payerId: 'rahul',
  category: 'Food & Dining',
  note: 'Amazing seafood dinner! 🦞',
} as const;

export const splitCategories = [
  'Food & Dining',
  'Travel',
  'Groceries',
  'Shopping',
  'Bills',
] as const;

export const splitDates = [
  '12 Sep 2026',
  '11 Sep 2026',
  '10 Sep 2026',
] as const;

export const splitGroups = [
  'Goa Beach Retreat',
  'Indiranagar Flatmates',
  'Weekend Trek',
] as const;

export const splitModes: {id: SplitMode; label: string; icon: string}[] = [
  {id: 'equal', label: 'Equal Split', icon: '♧'},
  {id: 'exact', label: 'Exact Amount', icon: '₹'},
  {id: 'percent', label: 'Custom %', icon: '◷'},
];

export const groupParticipants: SplitParticipant[] = [
  {id: 'rahul', name: 'Rahul', initials: 'R', tone: 'green', isCurrentUser: true},
  {id: 'vibhu', name: 'Vibhu', initials: 'V', tone: 'violet'},
  {id: 'aditi', name: 'Aditi', initials: 'A', tone: 'amber'},
  {id: 'priya', name: 'Priya', initials: 'P', tone: 'neutral'},
  {id: 'neha', name: 'Neha', initials: 'N', tone: 'violet'},
  {id: 'kabir', name: 'Kabir', initials: 'K', tone: 'green'},
];

export const suggestedParticipants: SplitParticipant[] = [
  {id: 'meera', name: 'Meera', initials: 'M', tone: 'amber'},
  {id: 'arjun', name: 'Arjun', initials: 'A', tone: 'neutral'},
];
