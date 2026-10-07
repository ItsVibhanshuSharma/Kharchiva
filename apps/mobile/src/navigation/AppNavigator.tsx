import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { BudgetDetailsScreen } from '../screens/budgets/BudgetDetailsScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { PhoneVerificationScreen } from '../screens/auth/PhoneVerificationScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ExportStatementScreen } from '../screens/export/ExportStatementScreen';
import { OfflineSyncScreen } from '../screens/sync/OfflineSyncScreen';
import { GroupsScreen } from '../screens/groups/GroupsScreen';
import { SplitExpenseScreen } from '../screens/groups/SplitExpenseScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { RecurringScreen } from '../screens/recurring/RecurringScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
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
          name="Reports"
          component={ReportsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BudgetDetails"
          component={BudgetDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Recurring"
          component={RecurringScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExportStatement"
          component={ExportStatementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OfflineSync"
          component={OfflineSyncScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Groups"
          component={GroupsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SplitExpense"
          component={SplitExpenseScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
