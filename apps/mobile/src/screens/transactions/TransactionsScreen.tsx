import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation} from '../../components/BottomNavigation';
import {CategoryIcon} from '../../components/CategoryIcon';
import {Card} from '../../components/Card';
import {Input} from '../../components/Input';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {kharchivaIcon} from '../../assets';
import {appTabItems, navigateToTab} from '../../navigation/appTabs';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing} from '../../theme';
import {getTransactionRepository} from '../../database/transactionRepository';
import type {LedgerTransaction, TransactionType} from '../../database/models/transaction';
import {formatTransactionCount} from './transactionUtils';
import {usePrivacy} from '../../features/privacy/privacy';
import {subscribeToEntryChanges} from '../../features/entries/entryEvents';
import {useLanguage} from '../../i18n/i18n';

type TransactionFilter = 'all' | TransactionType;
type PickerType = 'date' | 'category';
type TransactionGroup = {
  key: string;
  date: string;
  dateGroupLabel?: string;
  transactions: LedgerTransaction[];
};

const filters: {id: TransactionFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'expense', label: 'Expenses'},
  {id: 'income', label: 'Income'},
];

function formatRupees(amountPaise: number) {
  return (amountPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatAmount(transaction: LedgerTransaction) {
  const sign = transaction.type === 'income' ? '+' : '−';
  return `${sign}₹${formatRupees(transaction.amountPaise)}`;
}

function matchesDateFilter(transaction: LedgerTransaction, dateFilter: string) {
  return dateFilter === 'all' || transaction.dateGroup.startsWith(dateFilter);
}

function createGroups(transactions: LedgerTransaction[]): TransactionGroup[] {
  const grouped = new Map<string, TransactionGroup>();
  transactions.forEach(transaction => {
    const existing = grouped.get(transaction.dateGroup);
    if (existing) {
      existing.transactions.push(transaction);
    } else {
      grouped.set(transaction.dateGroup, {
        key: transaction.dateGroup,
        date: transaction.dateLabel,
        dateGroupLabel: transaction.dateGroupLabel,
        transactions: [transaction],
      });
    }
  });
  return Array.from(grouped.values()).sort((left, right) => right.key.localeCompare(left.key));
}

function TransactionRow({transaction, onPress}: {transaction: LedgerTransaction; onPress: () => void}) {
  const {mask} = usePrivacy();
  const isIncome = transaction.type === 'income';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${transaction.type} ${transaction.title}`}
      onPress={onPress}
      style={styles.transactionRow}
    >
      <CategoryIcon category={transaction.category} type={transaction.type} size={48} />
      <View style={styles.transactionDetails}>
        <Text numberOfLines={1} style={styles.transactionTitle}>{transaction.title}</Text>
        <View style={styles.metadataRow}>
          <Text numberOfLines={1} style={styles.metadataText}>{transaction.category}</Text>
          {transaction.paymentSource ? (
            <>
              <Text style={styles.metadataSeparator}>•</Text>
              <Text numberOfLines={1} style={styles.paymentSource}>{transaction.paymentSource}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.amount, isIncome && styles.incomeAmount]}>
        {mask(formatAmount(transaction))}
      </Text>
    </Pressable>
  );
}

export function TransactionsScreen() {
  const {mask} = usePrivacy();
  const {t, tDate} = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [picker, setPicker] = useState<PickerType | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoadState('loading');
    try {
      const repository = await getTransactionRepository();
      const result = await repository.listTransactions();
      setTransactions(result);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadTransactions();
  }, [loadTransactions]));
  useEffect(() => subscribeToEntryChanges(() => {
    loadTransactions();
  }), [loadTransactions]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardVisible) {
      return;
    }
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      return true;
    });
    return () => backSubscription.remove();
  }, [keyboardVisible]);

  const categories = useMemo(() => Array.from(new Set(transactions.map(item => item.category))).sort(), [transactions]);
  const dateOptions = useMemo(() => Array.from(new Set(transactions.map(item => item.dateGroup.slice(0, 7)))).sort().reverse(), [transactions]);
  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return transactions.filter(transaction => {
      const searchable = [transaction.title, transaction.category, formatRupees(transaction.amountPaise), transaction.paymentSource ?? '', transaction.note ?? '', transaction.dateLabel]
        .join(' ')
        .toLocaleLowerCase();
      return (filter === 'all' || transaction.type === filter)
        && matchesDateFilter(transaction, dateFilter)
        && (categoryFilter === 'all' || transaction.category === categoryFilter)
        && searchable.includes(normalizedQuery);
    });
  }, [categoryFilter, dateFilter, filter, query, transactions]);
  const groups = useMemo(() => createGroups(visibleTransactions), [visibleTransactions]);
  const periodTransactions = visibleTransactions.filter(transaction => transaction.type === 'expense');
  const totalAmountPaise = (filter === 'income' ? visibleTransactions : periodTransactions)
    .reduce((total, transaction) => total + transaction.amountPaise, 0);
  const totalLabel = filter === 'income' ? 'Total income' : 'Total spent';
  const selectedFilterLabel = picker === 'category' ? categoryFilter : dateFilter;

  // One tap: open the entry straight in the edit form, which also has Delete.
  const openEdit = (transaction: LedgerTransaction) => {
    navigation.navigate('AddExpense', {type: transaction.type, editId: transaction.id});
  };
  const setPickerValue = (value: string) => {
    if (picker === 'category') {
      setCategoryFilter(value);
    } else {
      setDateFilter(value);
    }
    setPicker(null);
  };

  return (
    <Screen style={[styles.screen, {paddingTop: Math.max(insets.top, spacing.md)}]}>
      <View style={styles.brandHeader}>
        <View style={styles.brandLockup}>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandIcon} />
          <View>
            <Text variant="heading" style={styles.brandName}>Kharchiva</Text>
            <Text variant="caption">Transactions</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          <Text style={styles.profileGlyph}>♙</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.screenTitle}>Transactions</Text>
            <Text style={styles.screenSubtitle}>Track and manage every expense</Text>
          </View>
        <View style={styles.sourceBadge}><View style={styles.sourceDot} /><Text style={styles.sourceText}>Local · not synced</Text></View>
        </View>

        <Input
          accessibilityLabel="Search transactions"
          onChangeText={setQuery}
          placeholder={t('⌕  Search transactions by name, tag or amount')}
          returnKeyType="search"
          value={query}
          containerStyle={styles.searchContainer}
          style={styles.searchInput}
        />

        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          {filters.map(item => {
            const isSelected = filter === item.id;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected: isSelected}} key={item.id} onPress={() => setFilter(item.id)} style={[styles.filterChip, isSelected && styles.selectedFilter]}>
                <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>{item.label}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Filter by date" onPress={() => setPicker('date')} style={styles.monthChip}>
            <Text numberOfLines={1} style={styles.filterText}>{dateFilter === 'all' ? 'All dates' : new Date(`${dateFilter}-01T00:00:00`).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</Text>
            <Text style={styles.chipChevron}>⌄</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.categoryFilterRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter by category" onPress={() => setPicker('category')} style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{categoryFilter === 'all' ? 'All categories' : categoryFilter}</Text>
            <Text style={styles.chipChevron}>⌄</Text>
          </Pressable>
          {(dateFilter !== 'all' || categoryFilter !== 'all') ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear date and category filters" onPress={() => {setDateFilter('all'); setCategoryFilter('all');}}>
              <Text style={styles.clearFilterText}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>

        <Card style={styles.periodCard}>
          <View style={styles.calendarIcon}><Text style={styles.calendarGlyph}>▦</Text></View>
          <View style={styles.periodDetails}>
            <Text style={styles.periodTitle}>{dateFilter === 'all' ? 'All dates' : new Date(`${dateFilter}-01T00:00:00`).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</Text>
            <Text style={styles.periodCount}>{formatTransactionCount(visibleTransactions.length)}</Text>
          </View>
          <View style={styles.totalDetails}>
            <Text style={styles.totalLabel}>{totalLabel}</Text>
            <Text style={styles.totalAmount}>{mask(`₹${formatRupees(totalAmountPaise)}`)}</Text>
          </View>
        </Card>

        {loadState === 'loading' ? (
          <Card style={styles.stateCard}><ActivityIndicator color={colors.primary} /><Text style={styles.stateMessage}>Loading transactions…</Text></Card>
        ) : loadState === 'error' ? (
          <Card style={styles.stateCard}>
            <Text style={styles.emptyTitle}>Couldn’t load transactions</Text>
            <Text style={styles.emptyMessage}>Please try again.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry loading transactions" onPress={() => loadTransactions()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></Pressable>
          </Card>
        ) : groups.length ? (
          groups.map(group => (
            <View key={group.key} style={styles.dateGroup}>
              <View style={styles.dateGroupHeader}>
                <View style={styles.dateGroupTitle}>
                  {group.dateGroupLabel ? <><Text style={styles.relativeDate}>{t(group.dateGroupLabel).toUpperCase()}</Text><Text style={styles.dateSeparator}>•</Text></> : null}
                  <Text style={styles.groupDate}>{tDate(group.date).toUpperCase()}</Text>
                </View>
                <Text style={styles.groupCount}>{formatTransactionCount(group.transactions.length)}</Text>
              </View>
              <Card style={styles.transactionCard}>
                {group.transactions.map((transaction, index) => <React.Fragment key={transaction.id}>{index > 0 ? <View style={styles.rowDivider} /> : null}<TransactionRow transaction={transaction} onPress={() => openEdit(transaction)} /></React.Fragment>)}
              </Card>
            </View>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptyMessage}>Try another search, date, category, or transaction type.</Text>
            {(query || dateFilter !== 'all' || categoryFilter !== 'all' || filter !== 'all') ? <Pressable accessibilityRole="button" accessibilityLabel="Clear all transaction filters" onPress={() => {setQuery(''); setFilter('all'); setDateFilter('all'); setCategoryFilter('all');}} style={styles.retryButton}><Text style={styles.retryText}>Clear filters</Text></Pressable> : null}
          </Card>
        )}
      </ScrollView>

      {!keyboardVisible ? <BottomNavigation onSelect={id => navigateToTab(navigation, id)} items={appTabItems('transactions')} /> : null}

      <Modal animationType="fade" transparent visible={Boolean(picker)} onRequestClose={() => setPicker(null)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close filters" onPress={() => setPicker(null)} style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{picker === 'category' ? 'Filter by category' : 'Filter by date'}</Text>
            <ScrollView style={styles.modalOptions}>
              {[...(picker === 'category' ? categories : dateOptions)].map(option => (
                <Pressable accessibilityRole="button" accessibilityLabel={option === selectedFilterLabel ? `Selected ${picker === 'category' ? option : new Date(`${option}-01T00:00:00`).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}` : picker === 'category' ? option : new Date(`${option}-01T00:00:00`).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})} key={option} onPress={() => setPickerValue(option)} style={styles.modalOption}>
                  <Text style={styles.modalOptionLabel}>{picker === 'category' ? option : new Date(`${option}-01T00:00:00`).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</Text>
                  {option === selectedFilterLabel ? <Text style={styles.selectedMark}>✓</Text> : null}
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel={picker === 'category' ? 'All categories' : 'All dates'} onPress={() => setPickerValue('all')} style={styles.modalOption}><Text style={styles.modalOptionLabel}>{picker === 'category' ? 'All categories' : 'All dates'}</Text>{selectedFilterLabel === 'all' ? <Text style={styles.selectedMark}>✓</Text> : null}</Pressable>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setPicker(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}


const styles = StyleSheet.create({
  screen: {paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  brandHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm},
  brandLockup: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  brandIcon: {height: 42, width: 42},
  brandName: {fontSize: 19, lineHeight: 24},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, height: 42, justifyContent: 'center', width: 42},
  profileGlyph: {color: colors.white, fontSize: 24, lineHeight: 30},
  scrollView: {flex: 1},
  content: {paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET, paddingHorizontal: spacing.lg, paddingTop: spacing.lg},
  titleRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg},
  titleCopy: {flex: 1, minWidth: 0},
  screenTitle: {color: colors.text, fontSize: 30, fontWeight: '700', lineHeight: 38},
  screenSubtitle: {color: colors.textMuted, fontSize: 14, lineHeight: 20},
  sourceBadge: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  sourceDot: {backgroundColor: colors.primary, borderRadius: radius.full, height: 7, width: 7},
  sourceText: {color: colors.textMuted, fontSize: 12},
  searchContainer: {marginBottom: spacing.md},
  searchInput: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, fontSize: 15, minHeight: 52},
  filters: {alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm},
  filterChip: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.lg},
  selectedFilter: {backgroundColor: colors.text},
  filterText: {color: colors.textMuted, fontSize: 14, fontWeight: '500'},
  selectedFilterText: {color: colors.white},
  monthChip: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', maxWidth: 178, minHeight: 40, paddingHorizontal: spacing.lg},
  chipChevron: {color: colors.textMuted, fontSize: 17},
  categoryFilterRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md},
  categoryChip: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, minHeight: 34, paddingHorizontal: spacing.md},
  categoryChipText: {color: colors.textMuted, fontSize: 12, fontWeight: '500'},
  clearFilterText: {color: colors.primary, fontSize: 12, fontWeight: '500'},
  periodCard: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted, borderRadius: radius.lg, elevation: 0, flexDirection: 'row', marginBottom: spacing.lg, padding: spacing.lg},
  calendarIcon: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 40, justifyContent: 'center', marginRight: spacing.md, width: 40},
  calendarGlyph: {color: colors.primary, fontSize: 20},
  periodDetails: {flex: 1, minWidth: 0},
  periodTitle: {color: colors.text, fontSize: 15, fontWeight: '600'},
  periodCount: {color: colors.textMuted, fontSize: 12, marginTop: 2},
  totalDetails: {alignItems: 'flex-end', marginLeft: spacing.sm},
  totalLabel: {color: colors.textMuted, fontSize: 12},
  totalAmount: {color: colors.text, fontSize: 19, fontWeight: '700', lineHeight: 24, marginTop: 2},
  dateGroup: {marginBottom: spacing.lg},
  dateGroupHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, minHeight: 24},
  dateGroupTitle: {alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: spacing.xs},
  relativeDate: {color: colors.primary, flexShrink: 0, fontSize: 12, fontWeight: '700'},
  dateSeparator: {color: colors.textMuted, fontSize: 12},
  groupDate: {color: colors.textMuted, fontSize: 12, fontWeight: '500'},
  groupCount: {color: colors.textMuted, fontSize: 12, marginLeft: spacing.sm},
  transactionCard: {borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  transactionRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 78, paddingVertical: spacing.sm},
  transactionDetails: {flex: 1, minWidth: 0},
  transactionTitle: {color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22},
  metadataRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs},
  metadataText: {color: colors.textMuted, flexShrink: 1, fontSize: 12},
  metadataSeparator: {color: colors.textMuted, fontSize: 12},
  paymentSource: {color: colors.primary, flexShrink: 1, fontSize: 12},
  amount: {color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: spacing.xs, textAlign: 'right'},
  incomeAmount: {color: colors.success, fontWeight: '700'},
  rowDivider: {backgroundColor: colors.border, height: StyleSheet.hairlineWidth},
  stateCard: {alignItems: 'center', gap: spacing.sm, padding: spacing.xxl},
  stateMessage: {color: colors.textMuted, fontSize: 13, marginTop: spacing.xs},
  emptyState: {alignItems: 'center', padding: spacing.xxl},
  emptyTitle: {color: colors.text, fontSize: 16, fontWeight: '600'},
  emptyMessage: {color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center'},
  retryButton: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, marginTop: spacing.md, minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xl},
  retryText: {color: colors.primary, fontSize: 13, fontWeight: '600'},
  modalRoot: {alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl},
  modalBackdrop: {backgroundColor: 'rgba(25, 23, 29, 0.42)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  modalCard: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, elevation: 8, maxHeight: '75%', padding: spacing.lg, width: '100%'},
  modalOptions: {flexGrow: 0, maxHeight: 360},
  modalTitle: {color: colors.text, fontSize: 18, fontWeight: '600'},
  modalOption: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 50, paddingVertical: spacing.sm},
  modalOptionLabel: {color: colors.text, fontSize: 15},
  selectedMark: {color: colors.primary, fontSize: 18, fontWeight: '700'},
  cancelButton: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, justifyContent: 'center', marginTop: spacing.md, minHeight: 42},
  cancelText: {color: colors.text, fontSize: 14, fontWeight: '500'},
});
