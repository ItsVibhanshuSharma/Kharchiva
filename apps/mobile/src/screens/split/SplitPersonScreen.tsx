import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { showSnackbar } from '../../components/snackbar';
import { HandCoins, Share2 } from '../../components/icons';
import { SettleSheet } from '../../features/split/SettleSheet';
import { buildShareMessage, historyFor } from '../../features/split/history';
import { balanceMap, removeSplitPerson, undoSettlement, useSplits } from '../../features/split/splitStore';
import { t as translateNow, useLanguage } from '../../i18n/i18n';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatShortDate } from '../../utils/dates';
import { formatRupees, formatSignedRupees } from '../../utils/money';

type Props = { route?: { params?: { personId?: string } } };

/** One friend: the balance, every bill and settlement behind it, and the buttons to settle or share. */
export function SplitPersonScreen({ route }: Props = {}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useLanguage();
  const splitState = useSplits();
  const [settling, setSettling] = useState(false);
  const personId = route?.params?.personId ?? '';
  const person = splitState.people.find(item => item.id === personId);
  const balance = balanceMap(splitState).get(personId) ?? 0;
  const items = historyFor(personId, splitState.splits, splitState.settlements);
  const name = person?.name ?? '';

  const share = () => {
    Share.share({ message: buildShareMessage(name, balance, items, translateNow) }).catch(() => undefined);
  };

  const confirmUndo = (settlementId: string) => {
    Alert.alert(t('Ye settle hatayein?'), t('Hisaab wapas pehle jaisa ho jayega.'), [
      { text: t('Rehne do'), style: 'cancel' },
      {
        text: t('Hatao'),
        style: 'destructive',
        onPress: () => {
          undoSettlement(settlementId).catch(() => showSnackbar({ tone: 'error', message: translateNow('Hat nahi paya. Phir try karo.') }));
        },
      },
    ]);
  };

  const confirmRemove = () => {
    Alert.alert(t('"{name}" hatayein?', { name }), t('Iska hisaab barabar hai. Dost ki list se hat jayega.'), [
      { text: t('Rehne do'), style: 'cancel' },
      {
        text: t('Hatao'),
        style: 'destructive',
        onPress: () => {
          removeSplitPerson(personId)
            .then(() => navigation.goBack())
            .catch(() => showSnackbar({ tone: 'error', message: translateNow('Hat nahi paya. Phir try karo.') }));
        },
      },
    ]);
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title={name || 'Dosto ka hisaab'} showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text variant="caption">{0 < balance ? t('{name} aapko dega', { name }) : balance < 0 ? t('Aapko {name} ko dena hai', { name }) : 'Hisaab barabar hai'}</Text>
          <Text accessibilityLabel="Balance" variant="title" style={[styles.heroAmount, 0 < balance ? styles.positive : balance < 0 ? styles.negative : styles.zero]}>
            {formatRupees(balance)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settle up"
            accessibilityState={{ disabled: balance === 0 }}
            disabled={balance === 0}
            onPress={() => setSettling(true)}
            style={({ pressed }) => [styles.primary, balance === 0 && styles.disabled, pressed && styles.pressed]}
          >
            <HandCoins color={colors.white} size={20} />
            <Text variant="button" style={styles.primaryText}>Settle up</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share the account"
            onPress={share}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Share2 color={colors.primary} size={18} />
            <Text variant="button" style={styles.secondaryText}>WhatsApp par bhejo</Text>
          </Pressable>
        </View>

        <Text variant="label" style={styles.sectionLabel}>HISAAB KI HISTORY</Text>
        {items.length === 0 ? (
          <Text variant="caption" style={styles.emptyText}>Abhi koi entry nahi hai.</Text>
        ) : (
          <View style={styles.list}>
            {items.map((item, index) => (
              <Pressable
                accessibilityRole={item.kind === 'settlement' ? 'button' : undefined}
                accessibilityLabel={item.kind === 'settlement' ? 'Undo this settlement' : undefined}
                disabled={item.kind !== 'settlement'}
                key={item.key}
                onPress={() => item.kind === 'settlement' && confirmUndo(item.settlementId)}
                style={[styles.row, index > 0 && styles.rowDivider]}
              >
                <View style={styles.rowMeta}>
                  <Text variant="label" numberOfLines={1} style={styles.rowTitle}>{item.kind === 'split' ? item.title : 'Settle up'}</Text>
                  <Text variant="caption">
                    {`${formatShortDate(item.date)} · ${
                      item.kind === 'split'
                        ? item.paidByMe
                          ? t('Aapne pay kiya · Bill {total}', { total: formatRupees(item.totalPaise) })
                          : t('{name} ne pay kiya · Bill {total}', { name, total: formatRupees(item.totalPaise) })
                        : item.direction === 'THEY_PAID_ME'
                          ? t('{name} ne aapko diye', { name })
                          : t('Aapne {name} ko diye', { name })
                    }`}
                  </Text>
                </View>
                <Text variant="label" style={item.kind === 'settlement' ? styles.zero : 0 < item.effectPaise ? styles.positive : styles.negative}>
                  {formatSignedRupees(item.effectPaise)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {balance === 0 && person ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove friend" onPress={confirmRemove} style={styles.removeButton}>
            <Text variant="label" style={styles.removeText}>Dost hatao</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <SettleSheet balancePaise={balance} name={name} onClose={() => setSettling(false)} personId={personId} visible={settling} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.md, paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
  hero: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.xs, padding: spacing.xl },
  heroAmount: { fontSize: 36, lineHeight: 44 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  zero: { color: colors.textMuted },
  actions: { gap: spacing.sm },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54 },
  primaryText: { color: colors.white },
  secondary: { alignItems: 'center', backgroundColor: colors.selected, borderColor: colors.primaryMuted, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52 },
  secondaryText: { color: colors.primary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  sectionLabel: { color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.sm },
  emptyText: { textAlign: 'center' },
  list: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopColor: colors.border, borderTopWidth: 1 },
  rowMeta: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text },
  removeButton: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  removeText: { color: colors.destructive },
});
