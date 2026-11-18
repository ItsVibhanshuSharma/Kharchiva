import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { Check } from '../../components/icons';
import { getRecurringRepository } from '../../database/recurringRepository';
import type { RecurringItem } from '../../database/repositories/RecurringRepository';
import { colors, radius, spacing } from '../../theme';
import { formatShortDate } from '../../utils/dates';
import { formatRupees } from '../../utils/money';
import { subscribeToEntryChanges } from '../entries/entryEvents';
import { addDueOccurrence, dueManualItems, skipDueOccurrence } from './runRecurring';

/** Home card for recurring items set to "ask me": Add or Skip, one tap each. */
export function RecurringDueCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [due, setDue] = useState<RecurringItem[]>([]);

  const load = useCallback(async () => {
    try {
      const repository = await getRecurringRepository();
      setDue(dueManualItems(await repository.list()));
    } catch {
      setDue([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => subscribeToEntryChanges(() => load()), [load]);

  const act = async (item: RecurringItem, add: boolean) => {
    try {
      if (add) await addDueOccurrence(item);
      else await skipDueOccurrence(item);
      showSnackbar({ message: add ? `${item.name} jud gaya` : `${item.name} is baar skip` });
    } catch {
      showSnackbar({ tone: 'error', message: 'Save nahi ho paya. Phir try karo.' });
    }
  };

  if (due.length === 0) return null;
  return (
    <View accessibilityLabel="Recurring due" style={styles.card}>
      <Text variant="label" style={styles.title}>Due hai</Text>
      {due.map(item => (
        <View key={item.id} style={styles.row}>
          <View style={styles.meta}>
            <Text variant="label" style={styles.name}>{`${item.name} · ${item.kind === 'income' ? '+' : '−'}${formatRupees(item.amountPaise)}`}</Text>
            <Text variant="caption">{formatShortDate(item.nextDate)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.name}`} onPress={() => act(item, true)} style={styles.add}>
            <Check color={colors.white} size={14} strokeWidth={3} />
            <Text variant="caption" style={styles.addText}>Jodo</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Skip ${item.name}`} onPress={() => act(item, false)} style={styles.skip}>
            <Text variant="caption" style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.selected, borderColor: colors.primaryMuted, borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  title: { color: colors.text, fontSize: 15 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  meta: { flex: 1, gap: 2 },
  name: { color: colors.text },
  add: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6 },
  addText: { color: colors.white, fontWeight: '700' },
  skip: { borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 6 },
  skipText: { color: colors.text, fontWeight: '700' },
});
