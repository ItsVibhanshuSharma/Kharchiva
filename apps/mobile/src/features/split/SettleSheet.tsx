import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { Check, X } from '../../components/icons';
import { t as translateNow, useLanguage } from '../../i18n/i18n';
import { colors, radius, spacing } from '../../theme';
import { dateForExpenseInput, parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';
import { formatRupees } from '../../utils/money';
import { recordSettlement } from './splitStore';

type Props = {
  visible: boolean;
  personId: string;
  name: string;
  /** Positive: the friend owes the user. Negative: the user owes the friend. */
  balancePaise: number;
  onClose: () => void;
};

/** Records money handed over, in full or in part. It never counts as income or expense. */
export function SettleSheet({ visible, personId, name, balancePaise, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const owed = Math.abs(balancePaise);

  useEffect(() => {
    if (!visible) return;
    setAmount(owed % 100 === 0 ? String(owed / 100) : (owed / 100).toFixed(2));
    setError('');
    setSaving(false);
  }, [visible, owed]);

  const save = async () => {
    const paise = parseRupeesToPaise(amount);
    if (!paise) return setError('Amount daalo.');
    if (paise > owed) return setError('Balance se zyada nahi ho sakta.');
    setSaving(true);
    try {
      await recordSettlement({
        personId,
        direction: balancePaise > 0 ? 'THEY_PAID_ME' : 'I_PAID_THEM',
        amountPaise: paise,
        date: dateForExpenseInput(new Date()),
      });
      showSnackbar({ message: translateNow('Settle ho gaya') });
      onClose();
    } catch {
      setError('Settle nahi ho paya. Phir try karo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close settle up" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>Settle up</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close settle up" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          <Text variant="caption">
            {balancePaise > 0
              ? t('{name} aapko {amount} dega.', { name, amount: formatRupees(owed) })
              : t('Aapko {name} ko {amount} dena hai.', { name, amount: formatRupees(owed) })}
          </Text>
          <Text variant="label" style={styles.label}>KITNE PAISE?</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              accessibilityLabel="Settle amount"
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={value => {
                setAmount(value.replace(/[^\d.]/g, ''));
                setError('');
              }}
              placeholder="0"
              placeholderTextColor={colors.border}
              style={styles.amountInput}
              value={amount}
            />
          </View>
          <Text variant="caption">Poora ya thoda hissa, jitna diya ho utna daalo.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm settle up"
            disabled={saving}
            onPress={save}
            style={[styles.saveButton, saving && styles.disabled]}
          >
            <Check color={colors.white} size={20} strokeWidth={2.8} />
            <Text variant="button" style={styles.saveText}>{saving ? 'Saving…' : 'Settle karo'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(34, 31, 44, 0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 36, justifyContent: 'center', width: 36 },
  label: { color: colors.textMuted, letterSpacing: 0.6 },
  amountRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  currency: { color: colors.textMuted, fontSize: 28, fontWeight: '700' },
  amountInput: { color: colors.text, flex: 1, fontSize: 32, fontWeight: '700', minHeight: 64, padding: 0 },
  error: { color: colors.destructive },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54 },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.white },
});
