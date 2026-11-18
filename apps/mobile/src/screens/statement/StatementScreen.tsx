import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { CalendarPicker } from '../../components/CalendarPicker';
import { showSnackbar } from '../../components/snackbar';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { CalendarDays, Download, Share2 } from '../../components/icons';
import type { LedgerTransaction } from '../../database/models/transaction';
import { getTransactionRepository } from '../../database/transactionRepository';
import {
  canSaveToDownloads,
  createStatementPdf,
  openSavedStatement,
  saveStatementToDownloads,
  shareStatementPdf,
} from '../../features/statement/shareStatement';
import {
  PRESETS,
  dayCount,
  matchPreset,
  normalizeRange,
  presetRange,
  rangeTitle,
  rangeToIso,
  type DateRange,
} from '../../features/statement/statementRange';
import { appTabItems, navigateToTab } from '../../navigation/appTabs';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { usePrivacy } from '../../features/privacy/privacy';
import { formatShortDate } from '../../utils/dates';
import { formatRupees, formatSignedRupees } from '../../utils/money';
import { dateForExpenseInput } from '../expenses/expenseInputUtils';
import { summarize } from '../home/monthSummary';

type StatementScreenProps = {
  route?: { params?: { from?: string; to?: string } };
};

type Busy = 'download' | 'share' | null;

export function StatementScreen({ route }: StatementScreenProps = {}) {
  const { mask } = usePrivacy();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = dateForExpenseInput(new Date());
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = route?.params ?? {};
    return from && to ? normalizeRange({ from, to }, today) : presetRange('thisMonth', today);
  });
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTransactionRepository()
      .then(repository => repository.listTransactions(rangeToIso(range)))
      .then(items => {
        if (!cancelled) setTransactions(items);
      })
      .catch(() => {
        if (!cancelled) showSnackbar({ tone: 'error', message: 'Entries load nahi ho payi. Phir try karo.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const summary = useMemo(() => summarize(transactions), [transactions]);
  const preset = matchPreset(range, today);
  const days = dayCount(range);
  const empty = !loading && transactions.length === 0;

  const changeRange = (next: DateRange) => {
    setRange(normalizeRange(next, today));
  };

  const onPick = (date: string) => {
    if (picking === 'from') changeRange({ from: date, to: date > range.to ? date : range.to });
    if (picking === 'to') changeRange({ from: range.from, to: date });
    setPicking(null);
  };

  const run = async (action: Exclude<Busy, null>) => {
    setBusy(action);
    try {
      // No user name on the PDF: profile details are still placeholders until real sign-in.
      const pdf = await createStatementPdf(range, transactions);
      if (action === 'download' && canSaveToDownloads()) {
        const uri = await saveStatementToDownloads(pdf);
        showSnackbar({
          message: 'Statement Downloads mein save ho gaya',
          action: {
            label: 'Kholo',
            onPress: () => {
              openSavedStatement(uri).catch(() =>
                showSnackbar({ tone: 'error', message: 'PDF kholne wali koi app nahi mili' }),
              );
            },
          },
        });
      } else {
        // iOS and older Android: the share sheet offers "Save to Files/Drive".
        await shareStatementPdf(pdf);
      }
    } catch {
      showSnackbar({ tone: 'error', message: 'Statement nahi ban paya. Phir try karo.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.header}>
        <Text variant="heading" style={styles.title}>Statement</Text>
        <Text variant="caption">Koi bhi dates chuno aur PDF lo</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text variant="label" style={styles.sectionLabel}>KITNE DIN KA?</Text>
        <View style={styles.chips}>
          {PRESETS.map(item => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Range ${item.label}`}
              accessibilityState={{ selected: preset === item.id }}
              key={item.id}
              onPress={() => changeRange(presetRange(item.id, today))}
              style={[styles.chip, preset === item.id && styles.chipSelected]}
            >
              <Text variant="label" style={preset === item.id ? styles.chipTextSelected : styles.chipText}>{item.label}</Text>
            </Pressable>
          ))}
          <View style={[styles.chip, preset === 'custom' && styles.chipSelected]}>
            <Text variant="label" style={preset === 'custom' ? styles.chipTextSelected : styles.chipText}>Custom</Text>
          </View>
        </View>

        <Text variant="label" style={styles.sectionLabel}>YA KHUD CHUNO</Text>
        <View style={styles.rangeRow}>
          {(['from', 'to'] as const).map(end => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={end === 'from' ? 'Choose start date' : 'Choose end date'}
              key={end}
              onPress={() => setPicking(end)}
              style={({ pressed }) => [styles.dateField, pressed && styles.pressed]}
            >
              <Text variant="caption">{end === 'from' ? 'From' : 'To'}</Text>
              <View style={styles.dateValueRow}>
                <CalendarDays color={colors.primary} size={18} />
                <Text accessibilityLabel={end === 'from' ? 'Start date' : 'End date'} variant="label" style={styles.dateValue}>
                  {formatShortDate(end === 'from' ? range.from : range.to)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewCard}>
          <Text variant="caption" style={styles.previewEyebrow}>{`${days} ${days === 1 ? 'day' : 'days'} · ${loading ? '…' : `${transactions.length} entries`}`}</Text>
          <Text accessibilityLabel="Statement title" variant="heading" style={styles.previewTitle}>{rangeTitle(range)}</Text>
          {loading ? (
            <ActivityIndicator color={colors.white} style={styles.previewLoader} />
          ) : (
            <View style={styles.previewStats}>
              <View style={styles.previewStat}>
                <Text variant="caption" style={styles.previewMuted}>Income</Text>
                <Text accessibilityLabel="Statement income" variant="label" style={styles.previewValue}>{mask(`+${formatRupees(summary.incomePaise)}`)}</Text>
              </View>
              <View style={styles.previewStat}>
                <Text variant="caption" style={styles.previewMuted}>Spent</Text>
                <Text accessibilityLabel="Statement spent" variant="label" style={styles.previewValue}>{mask(`−${formatRupees(summary.expensePaise)}`)}</Text>
              </View>
              <View style={styles.previewStat}>
                <Text variant="caption" style={styles.previewMuted}>Balance</Text>
                <Text accessibilityLabel="Statement balance" variant="label" style={styles.previewValue}>{mask(formatSignedRupees(summary.remainingPaise))}</Text>
              </View>
            </View>
          )}
        </View>

        {empty ? <Text variant="caption" style={styles.emptyText}>Is period mein koi entry nahi hai. Dusri dates chuno.</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download statement PDF"
          accessibilityState={{ busy: busy === 'download', disabled: Boolean(busy) || loading || empty }}
          disabled={Boolean(busy) || loading || empty}
          onPress={() => run('download')}
          style={({ pressed }) => [styles.primaryButton, (Boolean(busy) || loading || empty) && styles.disabled, pressed && styles.pressed]}
        >
          {busy === 'download' ? <ActivityIndicator color={colors.white} /> : <Download color={colors.white} size={20} strokeWidth={2.5} />}
          <Text variant="button" style={styles.primaryText}>{busy === 'download' ? 'Ban raha hai…' : 'Download PDF'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share statement PDF"
          accessibilityState={{ busy: busy === 'share', disabled: Boolean(busy) || loading || empty }}
          disabled={Boolean(busy) || loading || empty}
          onPress={() => run('share')}
          style={({ pressed }) => [styles.secondaryButton, (Boolean(busy) || loading || empty) && styles.disabled, pressed && styles.pressed]}
        >
          {busy === 'share' ? <ActivityIndicator color={colors.primary} /> : <Share2 color={colors.primary} size={18} />}
          <Text variant="button" style={styles.secondaryText}>WhatsApp / Drive par bhejo</Text>
        </Pressable>
      </ScrollView>

      <CalendarPicker
        maxDate={today}
        minDate={picking === 'to' ? range.from : undefined}
        onClose={() => setPicking(null)}
        onSelect={onPick}
        value={picking === 'to' ? range.to : range.from}
        visible={picking !== null}
      />
      <BottomNavigation onSelect={id => navigateToTab(navigation, id)} items={appTabItems('statement')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
  header: { gap: 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { fontSize: 24, lineHeight: 30 },
  scrollView: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET, paddingHorizontal: spacing.lg },
  sectionLabel: { color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.white },
  rangeRow: { flexDirection: 'row', gap: spacing.md },
  dateField: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  dateValueRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dateValue: { color: colors.text, fontSize: 15 },
  previewCard: { backgroundColor: '#4F12B3', borderRadius: 24, gap: spacing.xs, marginTop: spacing.sm, padding: spacing.lg },
  previewEyebrow: { color: 'rgba(255,255,255,0.72)' },
  previewTitle: { color: colors.white, fontSize: 22 },
  previewLoader: { marginVertical: spacing.md },
  previewStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  previewStat: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, flex: 1, gap: 2, padding: spacing.sm },
  previewMuted: { color: 'rgba(255,255,255,0.72)' },
  previewValue: { color: colors.white, fontSize: 14 },
  emptyText: { textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 54,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: { color: colors.white },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 50,
    justifyContent: 'center',
  },
  secondaryText: { color: colors.primary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
