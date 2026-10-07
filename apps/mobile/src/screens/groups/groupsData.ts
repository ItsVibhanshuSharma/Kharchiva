export type GroupMember = {
  initials: string;
  tone: 'violet' | 'green' | 'amber' | 'gray';
};

export type SharedGroup = {
  id: string;
  name: string;
  imageGlyph: string;
  imageTone: 'sand' | 'home';
  memberCount: number;
  totalShared: string;
  balanceLabel: string;
  balanceTone: 'owe' | 'owed';
  members: GroupMember[];
  activity: string;
  activityDetail: string;
  splitCount?: string;
  syncStatus?: string;
};

export type SharedActivity = {
  id: string;
  title: string;
  icon: string;
  tone: 'amber' | 'green' | 'violet';
  group: string;
  paidBy: string;
  amount: string;
  share: string;
  amountTone?: 'green';
};

export const groupOverview = {
  netAmount: '₹400',
  netLabel: 'Net you owe',
  oweGroup: 'Goa Retreat',
  oweAmount: '-₹1,250',
  owedGroup: 'Flatmates',
  owedAmount: '+₹850',
  groupCount: '2 Ongoing',
} as const;

export const sharedGroups: SharedGroup[] = [
  {
    id: 'goa-retreat',
    name: 'Goa Beach Retreat',
    imageGlyph: '🏖️',
    imageTone: 'sand',
    memberCount: 4,
    totalShared: '₹18,400',
    balanceLabel: 'You owe ₹1,250',
    balanceTone: 'owe',
    members: [
      {initials: 'V', tone: 'violet'},
      {initials: 'R', tone: 'green'},
      {initials: 'A', tone: 'amber'},
      {initials: 'P', tone: 'gray'},
    ],
    activity: 'Rahul paid Dinner',
    activityDetail: 'Yesterday · 8:42 PM',
    splitCount: '14 split items',
  },
  {
    id: 'flatmates',
    name: 'Indiranagar Flatmates',
    imageGlyph: '⌂',
    imageTone: 'home',
    memberCount: 3,
    totalShared: '₹32,000',
    balanceLabel: 'You are owed ₹850',
    balanceTone: 'owed',
    members: [
      {initials: 'V', tone: 'violet'},
      {initials: 'K', tone: 'green'},
      {initials: 'T', tone: 'gray'},
    ],
    activity: 'You paid Wi-Fi',
    activityDetail: '3 days ago',
    syncStatus: 'All utilities synced',
  },
];

export const sharedActivities: SharedActivity[] = [
  {id: 'dinner', title: 'Dinner at Fisherman’s Wharf', icon: '♜', tone: 'amber', group: 'Goa Retreat', paidBy: 'Paid by Rahul', amount: '₹600', share: 'Your share of ₹2,400'},
  {id: 'groceries', title: 'Grocery Run (Weekly)', icon: '🛒', tone: 'green', group: 'Flatmates', paidBy: 'Paid by you', amount: '+₹1,233', share: 'You lent of ₹1,850', amountTone: 'green'},
  {id: 'cab', title: 'Cab to Airport', icon: '▰', tone: 'violet', group: 'Goa Retreat', paidBy: 'Paid by Priya', amount: '₹225', share: 'Your share of ₹900'},
];
