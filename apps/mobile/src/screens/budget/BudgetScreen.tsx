import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Plus, Target } from '../../components/icons';
import type { LedgerTransaction } from '../../database/models/transaction';
import { TOTAL_BUDGET, type Budget } from '../../database/repositories/CatalogRepository';
import { getTransactionRepository } from '../../database/transactionRepository';
import { BudgetBar, LEVEL_COLORS } from '../../features/budget/BudgetBar';
import { BudgetSheet } from '../../features/budget/BudgetSheet';
import { budgetProgress, remainingText } from '../../features/budget/budgetProgress';
import { useCatalog } from '../../features/catalog/catalogStore';
import { subscribeToEntryChanges } from '../../features/entries/entryEvents';
import type { RootStackParamList } from '../../navigation/types';
import { useLanguage } from '../../i18n/i18n';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { currentMonthKey, monthLabel, monthRange } from '../home/monthSummary';

export function BudgetScreen() {
  useLanguage(); // re-render so amounts such as "bacha" follow the language
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const catalog = useCatalog();
  const month = currentMonthKey(new Date());
  const [expenses, setExpenses] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<{ editing: Budget | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const repository = await getTransactionRepository();
      setExpenses(await repository.listTransactions({ type: 'expense', ...monthRange(currentMonthKey(new Date())) }));
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => subscribeToEntryChanges(() => load()), [load]);

  const rows = budgetProgress(catalog.budgets, expenses);

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Budget" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}>
        <Text variant="caption" style={styles.intro}>
          Optional hai. Sirf un cheezon ki limit lagao jinhe aap dhyaan se dekhna chahte ho. Budget na ho to app waise hi chalti hai.
        </Text>
        <Text variant="label" style={styles.month}>{monthLabel(month)}</Text>

        {loading && !catalog.loaded ? (
          <ActivityIndicator color={colors.primary} />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Target color={colors.primary} size={30} /></View>
            <Text variant="heading" style={styles.emptyTitle}>Koi budget nahi hai</Text>
            <Text variant="caption" style={styles.emptyText}>
              Jaise Food ₹8,000. Hum is mahine ka kharch gin kar dikhayenge kitna bacha hai, aur 80% hone par bata denge.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create first budget"
              onPress={() => setSheet({ editing: null })}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Plus color={colors.white} size={20} strokeWidth={2.6} />
              <Text variant="button" style={styles.primaryText}>Pehla budget banao</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {rows.map(row => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${row.label} budget`}
                key={row.budget.id}
                onPress={() => setSheet({ editing: row.budget })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  {row.budget.category === TOTAL_BUDGET ? (
                    <View style={styles.totalIcon}><Target color={colors.primary} size={22} /></View>
                  ) : (
                    <CategoryIcon category={row.budget.category} type="expense" size={40} />
                  )}
                  <View style={styles.cardMeta}>
                    <Text variant="label" style={styles.cardTitle}>{row.label}</Text>
                    <Text accessibilityLabel={`${row.label} spent of limit`} variant="caption">
                      {`${formatRupees(row.spentPaise)} / ${formatRupees(row.limitPaise)}`}
                    </Text>
                  </View>
                  <Text accessibilityLabel={`${row.label} remaining`} variant="label" style={{ color: LEVEL_COLORS[row.level] }}>
                    {remainingText(row)}
                  </Text>
                </View>
                <BudgetBar ratio={row.ratio} level={row.level} />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add budget"
              onPress={() => setSheet({ editing: null })}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Plus color={colors.primary} size={18} strokeWidth={2.6} />
              <Text variant="button" style={styles.secondaryText}>Aur budget jodo</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <BudgetSheet editing={sheet?.editing ?? null} onClose={() => setSheet(null)} visible={sheet !== null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg },
  intro: { lineHeight: 18 },
  month: { color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.xs },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 64, justifyContent: 'center', width: 64 },
  emptyTitle: { fontSize: 18 },
  emptyText: { lineHeight: 18, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: 15 },
  totalIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 52, justifyContent: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  primaryText: { color: colors.white },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 50, justifyContent: 'center' },
  secondaryText: { color: colors.primary },
  pressed: { opacity: 0.7 },
});
