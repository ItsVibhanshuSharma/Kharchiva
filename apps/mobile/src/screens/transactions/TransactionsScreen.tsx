import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { mockTransactions } from './transactionsData';
import type { Transaction, TransactionType } from './transactionsData';
import { formatTransactionCount } from './transactionUtils';

type TransactionFilter = 'all' | TransactionType;

type TransactionGroup = {
  key: string;
  date: string;
  dateGroupLabel?: string;
  transactions: Transaction[];
};

const filters: { id: TransactionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

function formatAmount(transaction: Transaction) {
  const sign = transaction.type === 'income' ? '+' : '-';
  return `${sign}₹${transaction.amount.toLocaleString('en-IN')}`;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income';

  return (
    <View
      accessibilityLabel={`${transaction.type}, ${transaction.title}, ${formatAmount(transaction)}, ${transaction.category}, ${transaction.paymentSource ?? ''}`}
      style={styles.transactionRow}
    >
      <View style={[styles.transactionIcon, isIncome && styles.incomeIcon]}>
        <Text style={[styles.transactionGlyph, isIncome && styles.incomeGlyph]}>
          {transaction.icon}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text numberOfLines={1} style={styles.transactionTitle}>
          {transaction.title}
        </Text>
        <View style={styles.metadataRow}>
          <Text numberOfLines={1} style={styles.metadataText}>
            {transaction.category}
          </Text>
          {transaction.paymentSource ? (
            <>
              <Text style={styles.metadataSeparator}>•</Text>
              <Text numberOfLines={1} style={styles.paymentSource}>
                {transaction.paymentSource}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.amount, isIncome && styles.incomeAmount]}
      >
        {formatAmount(transaction)}
      </Text>
    </View>
  );
}

export function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [query, setQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardVisible) {
      return;
    }

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        Keyboard.dismiss();
        return true;
      },
    );

    return () => backSubscription.remove();
  }, [keyboardVisible]);

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return mockTransactions.filter(transaction => {
      const matchesFilter = filter === 'all' || transaction.type === filter;
      const searchableText = [
        transaction.title,
        transaction.category,
        transaction.amount.toString(),
        transaction.paymentSource ?? '',
        transaction.note ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase();

      return matchesFilter && searchableText.includes(normalizedQuery);
    });
  }, [filter, query]);

  const groups = useMemo(() => {
    const groupedTransactions = new Map<string, TransactionGroup>();

    visibleTransactions.forEach(transaction => {
      const existingGroup = groupedTransactions.get(transaction.dateGroup);
      if (existingGroup) {
        existingGroup.transactions.push(transaction);
      } else {
        groupedTransactions.set(transaction.dateGroup, {
          key: transaction.dateGroup,
          date: transaction.date,
          dateGroupLabel: transaction.dateGroupLabel,
          transactions: [transaction],
        });
      }
    });

    return Array.from(groupedTransactions.values());
  }, [visibleTransactions]);

  const totalAmount = visibleTransactions
    .filter(transaction =>
      filter === 'income' ? transaction.type === 'income' : transaction.type === 'expense',
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalLabel = filter === 'income' ? 'Total income' : 'Total spent';

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
            <Text variant="caption">Transactions</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          <Text style={styles.profileGlyph}>♙</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.screenTitle}>Transactions</Text>
            <Text style={styles.screenSubtitle}>
              Track and manage every expense
            </Text>
          </View>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </View>

        <Input
          accessibilityLabel="Search transactions"
          onChangeText={setQuery}
          placeholder="⌕  Search transactions by name, tag or amount"
          returnKeyType="search"
          value={query}
          containerStyle={styles.searchContainer}
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
        >
          {filters.map(item => {
            const isSelected = filter === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isSelected }}
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, isSelected && styles.selectedFilter]}
              >
                <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <View accessibilityLabel="September 2026" style={styles.monthChip}>
            <Text numberOfLines={1} style={styles.filterText}>September 2026</Text>
          </View>
        </ScrollView>

        <Card style={styles.periodCard}>
          <View style={styles.calendarIcon}>
            <Text style={styles.calendarGlyph}>▦</Text>
          </View>
          <View style={styles.periodDetails}>
            <Text style={styles.periodTitle}>September 2026</Text>
            <Text style={styles.periodCount}>
              {formatTransactionCount(visibleTransactions.length)}
            </Text>
          </View>
          <View style={styles.totalDetails}>
            <Text style={styles.totalLabel}>{totalLabel}</Text>
            <Text style={styles.totalAmount}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        </Card>

        {groups.length ? (
          groups.map(group => (
            <View key={group.key} style={styles.dateGroup}>
              <View style={styles.dateGroupHeader}>
                <View style={styles.dateGroupTitle}>
                  {group.dateGroupLabel ? (
                    <>
                      <Text style={styles.relativeDate}>{group.dateGroupLabel.toUpperCase()}</Text>
                      <Text style={styles.dateSeparator}>•</Text>
                    </>
                  ) : null}
                  <Text style={styles.groupDate}>{group.date.toUpperCase()}</Text>
                </View>
                <Text style={styles.groupCount}>
                  {formatTransactionCount(group.transactions.length)}
                </Text>
              </View>
              <Card style={styles.transactionCard}>
                {group.transactions.map((transaction, index) => (
                  <React.Fragment key={transaction.id}>
                    {index > 0 ? <View style={styles.rowDivider} /> : null}
                    <TransactionRow transaction={transaction} />
                  </React.Fragment>
                ))}
              </Card>
            </View>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptyMessage}>
              Try a different search or transaction type.
            </Text>
          </Card>
        )}
      </ScrollView>

      {!keyboardVisible ? (
        <BottomNavigation
          onSelect={id => {
            if (id === 'home') {
              navigation.navigate('Home');
            } else if (id === 'reports') {
              navigation.navigate('Reports');
            } else if (id === 'add') {
              navigation.navigate('AddExpense');
            } else if (id === 'profile') {
              navigation.navigate('Profile');
            }
          }}
          items={[
            { id: 'home', label: 'Home' },
            { id: 'transactions', label: 'Transaction', active: true },
            { id: 'add', label: '+' },
            { id: 'reports', label: 'Report' },
            { id: 'profile', label: 'Profile' },
          ]}
        />
      ) : null}
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
  brandIcon: {height: 42, width: 42},
  brandName: { fontSize: 19, lineHeight: 24 },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileGlyph: { color: colors.white, fontSize: 24, lineHeight: 30   },
  content: {
    paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  screenTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  screenSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  syncBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncDot: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  syncText: { color: colors.textMuted, fontSize: 13 },
  searchContainer: { marginBottom: spacing.lg },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    fontSize: 15,
    minHeight: 52,
  },
  filters: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  selectedFilter: { backgroundColor: colors.text },
  filterText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  selectedFilterText: { color: colors.white },
  monthChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    justifyContent: 'center',
    maxWidth: 168,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  periodCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    elevation: 0,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  calendarIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  calendarGlyph: { color: colors.primary, fontSize: 20 },
  periodDetails: { flex: 1, minWidth: 0 },
  periodTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  periodCount: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  totalDetails: { alignItems: 'flex-end', marginLeft: spacing.sm },
  totalLabel: { color: colors.textMuted, fontSize: 12 },
  totalAmount: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 2,
  },
  dateGroup: { marginBottom: spacing.lg },
  dateGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 24,
  },
  dateGroupTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
  },
  relativeDate: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dateSeparator: { color: colors.textMuted, fontSize: 12 },
  groupDate: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  groupCount: { color: colors.textMuted, fontSize: 12, marginLeft: spacing.sm },
  transactionCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  transactionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 84,
    paddingVertical: spacing.sm,
  },
  transactionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  incomeIcon: { backgroundColor: colors.successMuted },
  transactionGlyph: { color: colors.primary, fontSize: 21, fontWeight: '600' },
  incomeGlyph: { color: colors.success },
  transactionDetails: { flex: 1, minWidth: 0 },
  transactionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  metadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metadataText: { color: colors.textMuted, flexShrink: 1, fontSize: 12 },
  metadataSeparator: { color: colors.textMuted, fontSize: 12 },
  paymentSource: { color: colors.primary, flexShrink: 1, fontSize: 12 },
  amount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.xs,
    textAlign: 'right',
  },
  incomeAmount: { color: colors.success, fontWeight: '700' },
  rowDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  emptyState: { alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptyMessage: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
