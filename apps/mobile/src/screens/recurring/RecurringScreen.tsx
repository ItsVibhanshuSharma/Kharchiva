import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Plus, Repeat } from '../../components/icons';
import { getRecurringRepository } from '../../database/recurringRepository';
import type { RecurringItem } from '../../database/repositories/RecurringRepository';
import { subscribeToEntryChanges } from '../../features/entries/entryEvents';
import { RecurringSheet } from '../../features/recurring/RecurringSheet';
import { frequencyLabel } from '../../features/recurring/schedule';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatShortDate } from '../../utils/dates';
import { formatRupees } from '../../utils/money';

export function RecurringScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<{ editing: RecurringItem | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const repository = await getRecurringRepository();
      setItems(await repository.list());
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => subscribeToEntryChanges(() => load()), [load]);

  const sorted = [...items].sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Recurring" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}>
        <Text variant="caption" style={styles.intro}>
          Rent, Netflix, EMI ya salary ek baar daalo. Date aate hi entry apne aap jud jayegi, ya Home par poochh lenge.
        </Text>
        {loaded && sorted.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Repeat color={colors.primary} size={28} /></View>
            <Text variant="heading" style={styles.emptyTitle}>Kuch recurring nahi hai</Text>
          </View>
        ) : null}
        {sorted.map(item => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit recurring ${item.name}`}
            key={item.id}
            onPress={() => setSheet({ editing: item })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <CategoryIcon category={item.category} type={item.kind} size={42} />
            <View style={styles.meta}>
              <Text variant="label" style={styles.name}>{item.name}</Text>
              <Text variant="caption">{`${frequencyLabel(item.frequency)} · agli ${formatShortDate(item.nextDate)}${item.autoAdd ? '' : ' · poochhenge'}`}</Text>
            </View>
            <Text variant="label" style={item.kind === 'income' ? styles.positive : styles.negative}>
              {`${item.kind === 'income' ? '+' : '−'}${formatRupees(item.amountPaise)}`}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add recurring"
          onPress={() => setSheet({ editing: null })}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Plus color={colors.white} size={20} strokeWidth={2.6} />
          <Text variant="button" style={styles.addText}>Recurring jodo</Text>
        </Pressable>
      </ScrollView>
      <RecurringSheet editing={sheet?.editing ?? null} onClose={() => setSheet(null)} visible={sheet !== null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg },
  intro: { lineHeight: 18 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 60, justifyContent: 'center', width: 60 },
  emptyTitle: { fontSize: 18 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  meta: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  addButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 52, justifyContent: 'center' },
  addText: { color: colors.white },
  pressed: { opacity: 0.7 },
});
