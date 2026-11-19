import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ChevronRight, Plus, Users } from '../../components/icons';
import { NewItemSheet } from '../../features/catalog/NewItemSheet';
import { addSplitPerson, balanceMap, balanceTotals, useSplits } from '../../features/split/splitStore';
import { useLanguage } from '../../i18n/i18n';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { initialsOf } from '../profile/profileData';

/** Every friend with what they owe the user, or what the user owes them. */
export function SplitsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useLanguage();
  const splitState = useSplits();
  const [adding, setAdding] = useState(false);
  const balance = balanceMap(splitState);
  const { owedToMe, iOwe } = balanceTotals(splitState);
  const people = [...splitState.people].sort(
    (a, b) => Math.abs(balance.get(b.id) ?? 0) - Math.abs(balance.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Dosto ka hisaab" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text variant="caption">Aapko milne hain</Text>
            <Text accessibilityLabel="Total owed to you" variant="money" style={[styles.summaryAmount, styles.positive]}>{formatRupees(owedToMe)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text variant="caption">Aapko dene hain</Text>
            <Text accessibilityLabel="Total you owe" variant="money" style={[styles.summaryAmount, styles.negative]}>{formatRupees(iOwe)}</Text>
          </View>
        </View>

        {people.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Users color={colors.primary} size={28} /></View>
            <Text variant="heading" style={styles.emptyTitle}>Abhi koi dost nahi hai</Text>
            <Text variant="caption" style={styles.emptyText}>
              Expense add karte waqt "Dosto ke saath split karo" chalu karo, ya yahan se dost jodo.
            </Text>
          </View>
        ) : (
          people.map(person => {
            const value = balance.get(person.id) ?? 0;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${person.name}`}
                key={person.id}
                onPress={() => navigation.navigate('SplitPerson', { personId: person.id })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(person.name)}</Text></View>
                <View style={styles.meta}>
                  <Text variant="label" numberOfLines={1} style={styles.name}>{person.name}</Text>
                  <Text variant="caption">{value > 0 ? 'Aapko milna hai' : value < 0 ? 'Aapko dena hai' : 'Hisaab barabar hai'}</Text>
                </View>
                <Text accessibilityLabel={`${person.name} balance`} variant="label" style={value > 0 ? styles.positive : value < 0 ? styles.negative : styles.zero}>
                  {formatRupees(value)}
                </Text>
                <ChevronRight color={colors.textMuted} size={18} />
              </Pressable>
            );
          })
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a friend"
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Plus color={colors.primary} size={18} strokeWidth={2.6} />
          <Text variant="button" style={styles.addText}>Dost jodo</Text>
        </Pressable>
      </ScrollView>
      <NewItemSheet
        onClose={() => setAdding(false)}
        onSave={async name => {
          await addSplitPerson(name);
        }}
        placeholder={t('Jaise: Rahul')}
        title="Naya dost"
        visible={adding}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.md, paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
  summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', padding: spacing.lg },
  summaryCell: { flex: 1, gap: 4 },
  summaryDivider: { backgroundColor: colors.border, marginHorizontal: spacing.lg, width: 1 },
  summaryAmount: { fontSize: 22, lineHeight: 28 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  avatar: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  meta: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  zero: { color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 64, justifyContent: 'center', width: 64 },
  emptyTitle: { textAlign: 'center' },
  emptyText: { lineHeight: 18, maxWidth: 300, textAlign: 'center' },
  addButton: { alignItems: 'center', backgroundColor: colors.selected, borderColor: colors.primaryMuted, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52 },
  addText: { color: colors.primary },
  pressed: { opacity: 0.7 },
});
