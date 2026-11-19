import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { PhoneVerificationScreen } from '../screens/auth/PhoneVerificationScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { MpinScreen } from '../screens/profile/MpinScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { BudgetScreen } from '../screens/budget/BudgetScreen';
import { ManageListsScreen } from '../screens/settings/ManageListsScreen';
import { ReminderScreen } from '../screens/settings/ReminderScreen';
import { LanguageScreen } from '../screens/settings/LanguageScreen';
import { RecurringScreen } from '../screens/recurring/RecurringScreen';
import { SplitPersonScreen } from '../screens/split/SplitPersonScreen';
import { SplitsScreen } from '../screens/split/SplitsScreen';
import { AddGroupExpenseScreen } from '../screens/groups/AddGroupExpenseScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/groups/GroupDetailScreen';
import { GroupMembersScreen } from '../screens/groups/GroupMembersScreen';
import { GroupsScreen } from '../screens/groups/GroupsScreen';
import { JoinGroupScreen } from '../screens/groups/JoinGroupScreen';
import { navigationRef, onNavigationReady, useInviteLinks } from './linking';
import { StatementScreen } from '../screens/statement/StatementScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  useInviteLinks();
  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PhoneVerification"
          component={PhoneVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OTPVerification"
          component={OTPVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfileSetup"
          component={ProfileSetupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Mpin"
          component={MpinScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Statement"
          component={StatementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Budget" component={BudgetScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageLists" component={ManageListsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Reminder" component={ReminderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Recurring" component={RecurringScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Language" component={LanguageScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Splits" component={SplitsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SplitPerson" component={SplitPersonScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddGroupExpense" component={AddGroupExpenseScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ headerShown: false }} />
        <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
