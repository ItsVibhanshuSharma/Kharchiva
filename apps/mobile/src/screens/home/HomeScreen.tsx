import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

const dashboard = {
  greeting: 'Good evening',
  name: 'Vibhanshu',
  balance: '₹18,460',
  income: '₹22,000',
  expense: '₹12,540',
  savings: '₹9,460',
};

const transactions = [
  { title: 'Rent', amount: '-₹15,000', detail: 'Today, 10:30 AM', type: 'expense' },
  { title: 'Salary', amount: '+₹22,000', detail: 'Today, 9:00 AM', type: 'income' },
  { title: 'Groceries', amount: '-₹1,240', detail: 'Yesterday', type: 'expense' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
        },
      ]}
    >
      <View style={styles.brandHeader}>
        <View style={styles.brandLockup}>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandIcon} />
          <View>
            <Text variant="heading" style={styles.brandName}>Kharchiva</Text>
            <Text variant="caption">Home</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter" style={styles.filterButton}>
            <Text variant="label" numberOfLines={1} style={styles.filterText}>Filter</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Profile"
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <Text style={styles.profileGlyph}>♙</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryHeader}>
          <Text variant="title" style={styles.greeting}>
            {dashboard.greeting},{'\n'}{dashboard.name}
          </Text>
          <View style={styles.dateBadge}>
            <View style={styles.dateDot} />
            <Text variant="caption" style={styles.dateText}>Oct 2026</Text>
          </View>
        </View>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeading}>
            <Text variant="label">Available balance</Text>
            <View style={styles.paceBadge}>
              <View style={styles.dateDot} />
              <Text variant="caption" style={styles.paceText}>On track</Text>
            </View>
          </View>
          <View style={styles.balanceLine}>
            <Text variant="money" style={styles.balance}>{dashboard.balance}</Text>
            <Text variant="caption">available now</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Text style={styles.incomeGlyph}>↙</Text>
              </View>
              <View>
                <Text variant="caption">Income</Text>
                <Text variant="label" style={styles.statValue}>{dashboard.income}</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.expenseIcon}>
                <Text style={styles.expenseGlyph}>↗</Text>
              </View>
              <View>
                <Text variant="caption">Expenses</Text>
                <Text variant="label" style={styles.statValue}>{dashboard.expense}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Button
          onPress={() => navigation.navigate('AddExpense')}
          style={styles.addExpenseButton}
        >
          +  Add expense
        </Button>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Recurring"
          onPress={() => navigation.navigate('Recurring')}
          style={styles.recurringLink}
        >
          <Text variant="label" style={styles.recurringLinkText}>
            Recurring payments  ›
          </Text>
        </Pressable>

        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Text style={styles.insightGlyph}>₹</Text>
          </View>
          <View style={styles.insightCopy}>
            <Text variant="label" style={styles.insightTitle}>Savings this month</Text>
            <Text variant="caption">Available after your recorded expenses</Text>
          </View>
          <Text variant="label" style={styles.savingsAmount}>{dashboard.savings}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Budget Details"
          onPress={() => navigation.navigate('BudgetDetails')}
          style={styles.budgetCard}
        >
          <View style={styles.budgetHeading}>
            <Text variant="heading" style={styles.budgetTitle}>Monthly overview</Text>
            <Text variant="label" style={styles.budgetPercent}>57%</Text>
          </View>
          <View style={styles.budgetTrack}>
            <View style={styles.budgetFill} />
          </View>
          <View style={styles.budgetLegend}>
            <Text variant="caption">{dashboard.expense} spent</Text>
            <Text variant="caption">{dashboard.income} income</Text>
          </View>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text variant="heading">Recent Activity</Text>
            <Text variant="label" style={styles.viewAll}>View all  ›</Text>
          </View>
          <Card style={styles.transactionCard}>
          {transactions.map((transaction) => (
            <View key={transaction.title} style={styles.transactionRow}>
              <View style={styles.transactionIcon}>
                <Text variant="label" style={styles.transactionIconText}>
                  {transaction.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.transactionMeta}>
                <Text variant="label">{transaction.title}</Text>
                <Text variant="caption">{transaction.detail}</Text>
              </View>
              <Text
                variant="label"
                style={
                  transaction.type === 'income'
                    ? styles.incomeAmount
                    : styles.expenseAmount
                }
              >
                {transaction.amount}
              </Text>
            </View>
          ))}
          </Card>
        </View>
      </ScrollView>

      <BottomNavigation
        onSelect={id => {
          if (id === 'add') {
            navigation.navigate('AddExpense');
          } else if (id === 'transactions') {
            navigation.navigate('Transactions');
          } else if (id === 'reports') {
            navigation.navigate('Reports');
          } else if (id === 'profile') {
            navigation.navigate('Profile');
          }
        }}
        items={[
          { id: 'home', label: 'Home', active: true },
          { id: 'transactions', label: 'Transaction' },
          { id: 'add', label: '+' },
          { id: 'reports', label: 'Report' },
          { id: 'profile', label: 'Profile' },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollView: { flex: 1 },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  brandIcon: {height: 42, width: 42},
  brandName: { fontSize: 19, lineHeight: 24 },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  filterText: { color: colors.primary, flexShrink: 0 },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  profileGlyph: { color: colors.white, fontSize: 22, lineHeight: 28 },
  greeting: { fontSize: 30, lineHeight: 38, flex: 1 },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateDot: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  dateText: { color: colors.text },
  balanceCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  balanceHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paceBadge: {
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  paceText: { color: colors.success },
  balanceLine: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  balance: { color: colors.text, fontSize: 32, lineHeight: 40 },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 8,
    marginVertical: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: '100%',
    width: '58%',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 70,
    padding: spacing.sm,
  },
  statIcon: {
    alignItems: 'center',
    backgroundColor: '#DDF3EA',
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  incomeGlyph: { color: colors.success, fontSize: 20 },
  expenseIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  expenseGlyph: { color: colors.primary, fontSize: 20 },
  statValue: { color: colors.text, marginTop: 2 },
  addExpenseButton: { marginBottom: spacing.md },
  recurringLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recurringLinkText: { color: colors.primary },
  insightCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  insightIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  insightGlyph: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  insightCopy: { flex: 1 },
  insightTitle: { color: colors.text },
  savingsAmount: { color: colors.success },
  budgetCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  budgetHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  budgetTitle: { fontSize: 18, lineHeight: 26 },
  budgetPercent: { color: colors.success },
  budgetTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 8,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  budgetFill: { backgroundColor: colors.success, borderRadius: radius.full, height: '100%', width: '57%' },
  budgetLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  viewAll: { color: colors.primary },
  transactionCard: { borderRadius: radius.xl, padding: spacing.sm },
  content: {
    flexGrow: 1,
    paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  transactionRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  transactionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  transactionIconText: {
    color: colors.primary,
  },
  transactionMeta: {
    flex: 1,
  },
  incomeAmount: {
    color: colors.success,
  },
  expenseAmount: {
    color: colors.text,
  },
});
