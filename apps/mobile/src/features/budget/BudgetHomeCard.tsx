import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { useLanguage } from '../../i18n/i18n';
import { ChevronRight } from '../../components/icons';
import { colors, radius, spacing } from '../../theme';
import type { Budget } from '../../database/repositories/CatalogRepository';
import { BudgetBar, LEVEL_COLORS } from './BudgetBar';
import { budgetProgress, remainingText } from './budgetProgress';

const MAX_ROWS = 3;

type Props = {
  budgets: Budget[];
  monthExpenses: { category: string; amountPaise: number }[];
  onOpen: () => void;
};

/** Compact budget summary for Home. Renders nothing for users who never set a budget. */
export function BudgetHomeCard({ budgets, monthExpenses, onOpen }: Props) {
  useLanguage(); // re-render with translated amounts when the language changes
  if (budgets.length === 0) return null;
  const rows = budgetProgress(budgets, monthExpenses).slice(0, MAX_ROWS);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open budget"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text variant="label" style={styles.title}>Budget · is mahine</Text>
        <ChevronRight color={colors.textMuted} size={18} />
      </View>
      {rows.map(row => (
        <View key={row.budget.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text variant="label" numberOfLines={1} style={styles.label}>{row.label}</Text>
            <Text accessibilityLabel={`${row.label} budget left`} variant="caption" style={{ color: LEVEL_COLORS[row.level] }}>
              {remainingText(row)}
            </Text>
          </View>
          <BudgetBar ratio={row.ratio} level={row.level} height={6} />
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 15 },
  row: { gap: 6 },
  rowTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, flex: 1 },
  pressed: { opacity: 0.7 },
});
