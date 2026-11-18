import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { Check, Plus } from '../../components/icons';
import { getDayStatusRepository } from '../../database/dayStatusRepository';
import { getTransactionRepository } from '../../database/transactionRepository';
import { dateForExpenseInput } from '../../screens/expenses/expenseInputUtils';
import { colors, radius, spacing } from '../../theme';
import { notifyEntriesChanged, subscribeToEntryChanges } from '../entries/entryEvents';
import { dayLabel, missingDays, monthCompleteness } from './catchUp';

/** Window used to find the user's first activity and the recorded days. */
const HISTORY_DAYS = 60;
/** After this hour (India time) an empty today is worth a gentle nudge. */
const EVENING_HOUR = 18;
const MAX_ROWS = 4;

function shift(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function indiaHour(now: Date) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(now));
}

type State = { missing: string[]; todayOpen: boolean; completeness: { covered: number; total: number } | null };

/**
 * "You're N days behind" (PRD §22): lists recent days with no entry and no
 * "nothing spent" mark, each with one-tap Add or Nothing. Hidden when all is caught up.
 */
export function CatchUpCard({ onAdd, refreshKey = 0 }: { onAdd: (date: string) => void; refreshKey?: number }) {
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    try {
      const today = dateForExpenseInput(new Date());
      const from = shift(today, -HISTORY_DAYS);
      const fromIso = new Date(`${from}T00:00:00.000+05:30`).toISOString();
      const [transactions, days] = await Promise.all([
        getTransactionRepository().then(repository => repository.listTransactions({ from: fromIso })),
        getDayStatusRepository().then(repository => repository.noExpenseDays(from, today)),
      ]);
      const recorded = new Set(transactions.map(item => item.dateGroup));
      const firstActive = [...recorded, ...days].sort()[0] ?? null;
      setState({
        missing: missingDays(today, firstActive, recorded, days),
        todayOpen: firstActive !== null && !recorded.has(today) && !days.has(today) && indiaHour(new Date()) >= EVENING_HOUR,
        completeness: monthCompleteness(today, firstActive, recorded, days),
      });
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => subscribeToEntryChanges(() => load()), [load]);

  const markNothing = async (date: string) => {
    try {
      const repository = await getDayStatusRepository();
      await repository.markNoExpense(date);
      showSnackbar({ message: `${dayLabel(date)}: koi kharcha nahi` });
      notifyEntriesChanged();
    } catch {
      showSnackbar({ tone: 'error', message: 'Save nahi ho paya. Phir try karo.' });
    }
  };

  if (!state || (state.missing.length === 0 && !state.todayOpen)) return null;
  const today = dateForExpenseInput(new Date());
  const rows = [...(state.todayOpen ? [today] : []), ...state.missing].slice(0, MAX_ROWS);
  const behind = state.missing.length;

  return (
    <View accessibilityLabel="Catch up" style={styles.card}>
      <View>
        <Text variant="label" style={styles.title}>
          {behind > 0 ? `${behind} din ka hisaab baaki` : 'Aaj ka hisaab?'}
        </Text>
        {state.completeness ? (
          <Text variant="caption">{`Is mahine ${state.completeness.covered} / ${state.completeness.total} din recorded`}</Text>
        ) : null}
      </View>
      {rows.map(date => (
        <View key={date} style={styles.row}>
          <Text variant="label" style={styles.day}>{date === today ? 'Aaj' : dayLabel(date)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add for ${date}`}
            hitSlop={4}
            onPress={() => onAdd(date)}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Plus color={colors.white} size={14} strokeWidth={3} />
            <Text variant="caption" style={styles.addText}>Jodo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Nothing spent on ${date}`}
            hitSlop={4}
            onPress={() => markNothing(date)}
            style={({ pressed }) => [styles.nothing, pressed && styles.pressed]}
          >
            <Check color={colors.text} size={14} strokeWidth={3} />
            <Text variant="caption" style={styles.nothingText}>Kuch nahi</Text>
          </Pressable>
        </View>
      ))}
      {behind > MAX_ROWS - (state.todayOpen ? 1 : 0) ? (
        <Text variant="caption">{`+${behind - (MAX_ROWS - (state.todayOpen ? 1 : 0))} aur din`}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF8EC', borderColor: '#F5E2BF', borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  title: { color: colors.text, fontSize: 15 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  day: { color: colors.text, flex: 1 },
  add: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6 },
  addText: { color: colors.white, fontWeight: '700' },
  nothing: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6 },
  nothingText: { color: colors.text, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
