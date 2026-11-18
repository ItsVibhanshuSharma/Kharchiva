import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import type { LedgerTransaction } from '../../database/models/transaction';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { usePrivacy } from '../privacy/privacy';
import { categoryBreakdown } from './categoryBreakdown';

/** "Kahan gaya paisa": spend per category for the period on screen. Hidden when nothing was spent. */
export function CategorySpendCard({ transactions }: { transactions: Pick<LedgerTransaction, 'type' | 'category' | 'amountPaise'>[] }) {
  const { mask } = usePrivacy();
  const rows = categoryBreakdown(transactions);
  if (rows.length === 0) return null;
  return (
    <View accessibilityLabel="Spending by category" style={styles.card}>
      <Text variant="label" style={styles.title}>Kahan gaya paisa</Text>
      {rows.map(row => (
        <View key={row.category} style={styles.row}>
          {row.others ? <View style={styles.othersIcon}><Text style={styles.othersDots}>•••</Text></View> : <CategoryIcon category={row.category} type="expense" size={32} />}
          <View style={styles.meta}>
            <View style={styles.line}>
              <Text variant="label" numberOfLines={1} style={styles.name}>{row.category}</Text>
              <Text variant="label" style={styles.amount}>{mask(formatRupees(row.amountPaise))}</Text>
            </View>
            <View style={styles.barRow}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(Math.round(row.ratio * 100), 2)}%` }]} />
              </View>
              <Text variant="caption" style={styles.percent}>{`${row.percent}%`}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 15 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  othersIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 32, justifyContent: 'center', width: 32 },
  othersDots: { color: colors.textMuted, fontSize: 10 },
  meta: { flex: 1, gap: 6 },
  line: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  name: { color: colors.text, flexShrink: 1 },
  amount: { color: colors.text },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  track: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flex: 1, height: 6, overflow: 'hidden' },
  fill: { backgroundColor: colors.primary, borderRadius: radius.full, height: 6 },
  percent: { minWidth: 34, textAlign: 'right' },
});
