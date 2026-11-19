import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { ChevronRight, Users } from '../../components/icons';
import { usePrivacy } from '../privacy/privacy';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { useGroupsOverview } from './useGroupsOverview';

type Props = { onOpen: () => void };

/** Home card for Splitwise groups. Renders nothing until the user is in at least one group. */
export function GroupsHomeCard({ onOpen }: Props) {
  const { overview } = useGroupsOverview();
  const { mask } = usePrivacy();
  if (!overview || overview.summary.groupCount === 0) return null;
  const { groupCount, youGetPaise, youOwePaise } = overview.summary;
  const net = youGetPaise - youOwePaise;
  const caption =
    net > 0 ? `You get ${mask(formatRupees(net))} overall` : net < 0 ? `You owe ${mask(formatRupees(-net))} overall` : 'All settled up';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Splitwise groups"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          <Users color={colors.primary} size={18} />
        </View>
        <Text variant="label" style={styles.title}>{groupCount === 1 ? 'Splitwise · 1 group' : `Splitwise · ${groupCount} groups`}</Text>
        <ChevronRight color={colors.textMuted} size={18} />
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="caption">{'You get'}</Text>
          <Text variant="label" style={[styles.amount, { color: colors.success }]}>{mask(formatRupees(youGetPaise))}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="caption">{'You owe'}</Text>
          <Text variant="label" style={[styles.amount, { color: colors.destructive }]}>{mask(formatRupees(youOwePaise))}</Text>
        </View>
      </View>
      <Text variant="caption">{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  icon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.md, height: 32, justifyContent: 'center', width: 32 },
  title: { color: colors.text, flex: 1, fontSize: 15 },
  row: { flexDirection: 'row', gap: spacing.md },
  cell: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flex: 1, gap: 2, padding: spacing.md },
  amount: { fontSize: 18, lineHeight: 24 },
  pressed: { opacity: 0.7 },
});
