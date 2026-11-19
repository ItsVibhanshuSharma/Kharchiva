import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { ChevronRight } from '../../components/icons';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { usePrivacy } from '../privacy/privacy';
import { balanceTotals, useSplits } from './splitStore';

/** Home summary of what friends owe the user and what the user owes. Hidden when nothing is pending. */
export function SplitHomeCard({ onOpen }: { onOpen: () => void }) {
  const { mask } = usePrivacy();
  const { owedToMe, iOwe } = balanceTotals(useSplits());
  if (owedToMe === 0 && iOwe === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open friends account"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text variant="label" style={styles.title}>Dosto ka hisaab</Text>
        <ChevronRight color={colors.textMuted} size={18} />
      </View>
      <View style={styles.row}>
        {owedToMe > 0 ? (
          <View style={styles.cell}>
            <Text variant="caption">Aapko milne hain</Text>
            <Text accessibilityLabel="Owed to you" variant="label" style={styles.positive}>{mask(formatRupees(owedToMe))}</Text>
          </View>
        ) : null}
        {iOwe > 0 ? (
          <View style={styles.cell}>
            <Text variant="caption">Aapko dene hain</Text>
            <Text accessibilityLabel="You owe" variant="label" style={styles.negative}>{mask(formatRupees(iOwe))}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 15 },
  row: { flexDirection: 'row', gap: spacing.xl },
  cell: { gap: 2 },
  positive: { color: colors.success, fontSize: 18 },
  negative: { color: colors.destructive, fontSize: 18 },
  pressed: { opacity: 0.7 },
});
