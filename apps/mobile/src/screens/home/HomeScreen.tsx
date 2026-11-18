import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Mic, Minus, Plus, UserRound } from '../../components/icons';
import { subscribeToEntryChanges } from '../../features/entries/entryEvents';
import { SmsReviewSheet } from '../../features/sms/SmsReviewSheet';
import { askForSmsPermission } from '../../features/sms/smsInbox';
import { useSmsDrafts } from '../../features/sms/useSmsDrafts';
import { VoiceEntrySheet } from '../../features/voice/VoiceEntrySheet';
import type { LedgerTransaction } from '../../database/models/transaction';
import { getTransactionRepository } from '../../database/transactionRepository';
import { appTabItems, navigateToTab } from '../../navigation/appTabs';
import type { RootStackParamList } from '../../navigation/types';
import { usePrivacy } from '../../features/privacy/privacy';
import { colors, radius, spacing } from '../../theme';
import {
  currentMonthKey,
  formatRupees,
  formatSignedRupees,
  isSameMonth,
  monthLabel,
  monthlyBreakdown,
  monthRange,
  shiftMonth,
  summarize,
  yearRange,
  type MonthKey,
} from './monthSummary';

const RECENT_LIMIT = 5;

type PeriodView = 'month' | 'year';

const hero = {
  background: '#4F12B3',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  glass: 'rgba(255,255,255,0.14)',
  track: 'rgba(255,255,255,0.22)',
  positive: '#7CF5C4',
  negative: '#FFB4B4',
};

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(now),
  );
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 17) return 'Good afternoon 🌤️';
  return 'Good evening 🌙';
}

/** Neutral, non-judgemental summary of the period (see PRD: "Do not judge the user"). */
function insight(incomePaise: number, expensePaise: number) {
  if (incomePaise === 0 && expensePaise === 0) return 'Nothing recorded yet';
  if (incomePaise === 0) return 'No income recorded yet';
  const spentShare = Math.round((expensePaise / incomePaise) * 100);
  return spentShare <= 100 ? `${spentShare}% of income spent` : `Spent ${spentShare - 100}% more than income`;
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { mask } = usePrivacy();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [view, setView] = useState<PeriodView>('month');
  const [month, setMonth] = useState<MonthKey>(() => currentMonthKey(new Date()));
  const [year, setYear] = useState(() => currentMonthKey(new Date()).year);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const sms = useSmsDrafts();
  // Bumped when entries change outside this screen (voice sheet, quick-add window),
  // since neither moves focus away from Home.
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => subscribeToEntryChanges(() => setRefreshKey(key => key + 1)), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setLoadError('');
      getTransactionRepository()
        .then(repository => repository.listTransactions(view === 'month' ? monthRange(month) : yearRange(year)))
        .then(items => {
          if (!cancelled) setTransactions(items);
        })
        .catch(() => {
          if (!cancelled) setLoadError('Could not load this period. Please try again.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
      // refreshKey is not read inside; changing it is what forces a reload.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, month, year, refreshKey]),
  );

  const summary = summarize(transactions);
  const thisMonth = currentMonthKey(new Date());
  const isYear = view === 'year';
  const atLatest = isYear ? year >= thisMonth.year : isSameMonth(month, thisMonth);
  const negative = summary.remainingPaise < 0;
  const breakdown = isYear ? monthlyBreakdown(transactions, year, thisMonth) : [];
  const spentRatio = summary.incomePaise > 0
    ? Math.min(summary.expensePaise / summary.incomePaise, 1)
    : summary.expensePaise > 0 ? 1 : 0;
  const goPrevious = () => (isYear ? setYear(year - 1) : setMonth(shiftMonth(month, -1)));
  const goNext = () => (isYear ? setYear(year + 1) : setMonth(shiftMonth(month, 1)));
  const openMonth = (key: MonthKey) => {
    setMonth(key);
    setView('month');
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.header}>
        <View>
          <Text variant="caption" style={styles.greeting}>{greeting(new Date())}</Text>
          <Text variant="heading" style={styles.brandName}>Kharchiva</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Voice entry lives in the header so it is the first thing the eye lands on. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add by voice"
            hitSlop={6}
            onPress={() => setVoiceOpen(true)}
            style={({ pressed }) => [styles.voiceButton, pressed && styles.pressed]}
          >
            <Mic color={colors.white} size={20} strokeWidth={2.5} />
            <Text variant="label" style={styles.voiceText}>Bolo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Profile"
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <UserRound color={colors.primary} size={22} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sms.available && (sms.drafts.length > 0 || !sms.permitted) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sms.drafts.length > 0 ? 'Review SMS transactions' : 'Turn on SMS detection'}
            onPress={() => (sms.drafts.length > 0 ? setSmsOpen(true) : askForSmsPermission().then(sms.refresh))}
            style={styles.smsBanner}
          >
            <Text variant="label" style={styles.smsBannerText}>
              {sms.drafts.length > 0
                ? `${sms.drafts.length} naye SMS transactions mile. Review karo`
                : 'Bank SMS se kharche apne aap pakdo. Chalu karo'}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.periodRow}>
          <View style={styles.periodSwitcher}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isYear ? 'Previous year' : 'Previous month'}
              hitSlop={8}
              onPress={goPrevious}
              style={styles.periodArrow}
            >
              <ChevronLeft color={colors.text} size={20} />
            </Pressable>
            <Text accessibilityLabel="Selected period" variant="label" style={styles.periodLabel}>
              {isYear ? String(year) : monthLabel(month)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isYear ? 'Next year' : 'Next month'}
              accessibilityState={{ disabled: atLatest }}
              disabled={atLatest}
              hitSlop={8}
              onPress={goNext}
              style={[styles.periodArrow, atLatest && styles.disabled]}
            >
              <ChevronRight color={colors.text} size={20} />
            </Pressable>
          </View>
          <View style={styles.segment}>
            {(['month', 'year'] as const).map(option => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option === 'month' ? 'Month view' : 'Year view'}
                accessibilityState={{ selected: view === option }}
                key={option}
                onPress={() => setView(option)}
                style={[styles.segmentOption, view === option && styles.segmentSelected]}
              >
                <Text variant="label" style={view === option ? styles.segmentTextSelected : styles.segmentText}>
                  {option === 'month' ? 'Month' : 'Year'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.heroCard}>
          {/* Decorative circles give the card depth without a gradient library. */}
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />
          <Text variant="label" style={styles.heroLabel}>{isYear ? 'Remaining this year' : 'Remaining this month'}</Text>
          <Text
            accessibilityLabel="Remaining amount"
            style={[styles.heroAmount, { color: negative ? hero.negative : hero.text }]}
          >
            {mask(formatSignedRupees(summary.remainingPaise))}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: negative ? hero.negative : hero.positive, width: `${Math.round(spentRatio * 100)}%` },
              ]}
            />
          </View>
          <Text variant="caption" style={styles.heroInsight}>{mask(insight(summary.incomePaise, summary.expensePaise))}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <View style={styles.heroStatIcon}><ArrowDownLeft color={hero.positive} size={18} strokeWidth={2.6} /></View>
              <View>
                <Text variant="caption" style={styles.heroStatLabel}>Income</Text>
                <Text accessibilityLabel="Total income" variant="label" style={styles.heroStatValue}>
                  {mask(`+${formatRupees(summary.incomePaise)}`)}
                </Text>
              </View>
            </View>
            <View style={styles.heroStat}>
              <View style={styles.heroStatIcon}><ArrowUpRight color={hero.negative} size={18} strokeWidth={2.6} /></View>
              <View>
                <Text variant="caption" style={styles.heroStatLabel}>Spent</Text>
                <Text accessibilityLabel="Total spent" variant="label" style={styles.heroStatValue}>
                  {mask(`−${formatRupees(summary.expensePaise)}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add income"
            onPress={() => navigation.navigate('AddExpense', { type: 'income' })}
            style={({ pressed }) => [styles.actionCard, styles.incomeAction, pressed && styles.pressed]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
              <Plus color={colors.white} size={20} strokeWidth={2.8} />
            </View>
            <View>
              <Text variant="label" style={styles.actionTitle}>Income</Text>
              <Text variant="caption">Paisa aaya</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            onPress={() => navigation.navigate('AddExpense', { type: 'expense' })}
            style={({ pressed }) => [styles.actionCard, styles.expenseAction, pressed && styles.pressed]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.destructive }]}>
              <Minus color={colors.white} size={20} strokeWidth={2.8} />
            </View>
            <View>
              <Text variant="label" style={styles.actionTitle}>Expense</Text>
              <Text variant="caption">Paisa gaya</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text variant="heading" style={styles.sectionTitle}>{isYear ? 'Month by month' : 'This month'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all transactions"
            hitSlop={8}
            onPress={() => navigation.navigate('Transactions')}
          >
            <Text variant="label" style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {loadError ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{loadError}</Text> : null}
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} />
        ) : isYear ? (
          <View style={styles.listCard}>
            {breakdown.slice().reverse().map((row, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${monthLabel(row.month)}`}
                key={row.label}
                onPress={() => openMonth(row.month)}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.pressed]}
              >
                <View style={styles.monthBadge}>
                  <Text variant="label" style={styles.monthBadgeText}>{row.label}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text variant="label" style={styles.rowTitle}>{monthLabel(row.month)}</Text>
                  <Text variant="caption">{mask(`+${formatRupees(row.incomePaise)} in · −${formatRupees(row.expensePaise)} out`)}</Text>
                </View>
                <Text
                  accessibilityLabel={`${row.label} remaining`}
                  variant="label"
                  style={row.remainingPaise < 0 ? styles.negative : row.remainingPaise > 0 ? styles.positive : styles.zero}
                >
                  {mask(formatSignedRupees(row.remainingPaise))}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🪙</Text>
            <Text variant="caption" style={styles.emptyText}>No entries yet. Add your salary or an expense to begin.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {transactions.slice(0, RECENT_LIMIT).map((transaction, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${transaction.type} ${transaction.title}`}
                key={`${transaction.type}-${transaction.id}`}
                onPress={() => navigation.navigate('AddExpense', { type: transaction.type, editId: transaction.id })}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.pressed]}
              >
                <CategoryIcon category={transaction.category} type={transaction.type} />
                <View style={styles.rowMeta}>
                  <Text variant="label" numberOfLines={1} style={styles.rowTitle}>{transaction.title}</Text>
                  <Text variant="caption" numberOfLines={1}>{`${transaction.dateLabel} · ${transaction.category}`}</Text>
                </View>
                <Text variant="label" style={[styles.rowAmount, transaction.type === 'income' ? styles.positive : styles.negative]}>
                  {mask(`${transaction.type === 'income' ? '+' : '−'}${formatRupees(transaction.amountPaise)}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <VoiceEntrySheet
        onClose={() => setVoiceOpen(false)}
        onSaved={() => undefined}
        visible={voiceOpen}
      />
      <SmsReviewSheet drafts={sms.drafts} onClose={() => setSmsOpen(false)} visible={smsOpen} />
      <BottomNavigation onSelect={id => navigateToTab(navigation, id)} items={appTabItems('home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  greeting: { fontSize: 13 },
  brandName: { fontSize: 22, lineHeight: 28 },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  scrollView: { flex: 1 },
  content: {
    gap: spacing.lg,
    paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  periodRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  periodSwitcher: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  periodArrow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  periodLabel: { color: colors.text, fontSize: 16, minWidth: 128, textAlign: 'center' },
  disabled: { opacity: 0.35 },
  segment: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 3 },
  segmentOption: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  segmentSelected: { backgroundColor: colors.surface, elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  segmentText: { color: colors.textMuted },
  segmentTextSelected: { color: colors.primary },
  heroCard: {
    backgroundColor: hero.background,
    borderRadius: 28,
    elevation: 8,
    overflow: 'hidden',
    padding: spacing.xl,
    shadowColor: hero.background,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  blob: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, position: 'absolute' },
  blobTop: { height: 200, right: -60, top: -80, width: 200 },
  blobBottom: { bottom: -90, height: 180, left: -50, width: 180 },
  heroLabel: { color: hero.muted },
  heroAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5, lineHeight: 50, marginTop: spacing.xs },
  progressTrack: { backgroundColor: hero.track, borderRadius: radius.full, height: 8, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { borderRadius: radius.full, height: 8 },
  heroInsight: { color: hero.muted, marginTop: spacing.xs },
  heroStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  heroStat: {
    alignItems: 'center',
    backgroundColor: hero.glass,
    borderRadius: radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  heroStatIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.full, height: 32, justifyContent: 'center', width: 32 },
  heroStatLabel: { color: hero.muted },
  heroStatValue: { color: hero.text, fontSize: 15 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  incomeAction: { backgroundColor: '#E9FBF2', borderColor: '#C3EED8' },
  expenseAction: { backgroundColor: '#FFF0F0', borderColor: '#F5D0D2' },
  actionIcon: { alignItems: 'center', borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  actionTitle: { color: colors.text, fontSize: 15 },
  pressed: { opacity: 0.7 },
  smsBanner: { backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  smsBannerText: { color: colors.primary },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  voiceText: { color: colors.white, fontSize: 15 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20 },
  viewAll: { color: colors.primary },
  errorText: { color: colors.destructive },
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  rowMeta: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15 },
  rowAmount: { fontSize: 15 },
  monthBadge: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  monthBadgeText: { color: colors.primary },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  zero: { color: colors.textMuted },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 40 },
  emptyText: { textAlign: 'center' },
});
