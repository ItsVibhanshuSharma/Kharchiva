import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomNavigationItem } from '../components/BottomNavigation';
import type { RootStackParamList } from './types';

/** Screens reachable from the bottom bar. The centre "+" opens Add Expense. */
export type AppTab = 'home' | 'transactions' | 'statement' | 'profile';

/** Two tabs either side of "+": Home · Transaction · + · Statement · Profile. */
export function appTabItems(active: AppTab): BottomNavigationItem[] {
  return [
    { id: 'home', label: 'Home', active: active === 'home' },
    { id: 'transactions', label: 'Transaction', active: active === 'transactions' },
    { id: 'add', label: '+' },
    { id: 'statement', label: 'Statement', active: active === 'statement' },
    { id: 'profile', label: 'Profile', active: active === 'profile' },
  ];
}

export function navigateToTab(navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>, id: string) {
  switch (id) {
    case 'home':
      navigation.navigate('Home');
      break;
    case 'transactions':
      navigation.navigate('Transactions');
      break;
    case 'add':
      navigation.navigate('AddExpense', { type: 'expense' });
      break;
    case 'statement':
      navigation.navigate('Statement');
      break;
    case 'profile':
      navigation.navigate('Profile');
      break;
  }
}
