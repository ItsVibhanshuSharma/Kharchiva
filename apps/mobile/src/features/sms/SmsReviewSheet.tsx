import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import { Check, X } from '../../components/icons';
import { getTransactionRepository } from '../../database/transactionRepository';
import { colors, radius, spacing } from '../../theme';
import { dateForExpenseInput } from '../../screens/expenses/expenseInputUtils';
import { formatShortDate } from '../../utils/dates';
import { formatRupees } from '../../utils/money';
import { notifyEntriesChanged } from '../entries/entryEvents';
import type { SmsDraft } from './parseBankSms';
import { discardSms } from './smsInbox';

type Props = {
  visible: boolean;
  drafts: SmsDraft[];
  onClose: () => void;
};

const titleOf = (draft: SmsDraft) => draft.merchant ?? draft.paymentSource ?? draft.category;

/** Lists transactions found in SMS. Nothing reaches the ledger until the user saves. */
export function SmsReviewSheet({ visible, drafts, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      setFlipped(new Set());
      setGone(new Set());
      setSaving(false);
      setMessage('');
    }
  }, [visible]);

  const items = drafts
    .filter(draft => !gone.has(draft.id))
    .map(draft => (flipped.has(draft.id) ? { ...draft, type: draft.type === 'income' ? ('expense' as const) : ('income' as const), category: 'Other' } : draft));

  const dismiss = async (id: string) => {
    setGone(current => new Set([...current, id]));
    await discardSms([id]).catch(() => undefined);
    notifyEntriesChanged();
  };

  const save = async () => {
    if (!items.length || saving) return;
    setSaving(true);
    setMessage('');
    const saved: string[] = [];
    try {
      const repository = await getTransactionRepository();
      for (const draft of items) {
        if (draft.type === 'income') {
          await repository.createIncome({ amountPaise: draft.amountPaise, category: draft.category, occurredAt: draft.occurredAt, note: draft.note, sourceName: draft.merchant });
        } else {
          await repository.createExpense({
            amountPaise: draft.amountPaise, category: draft.category, occurredAt: draft.occurredAt, note: draft.note,
            merchant: draft.merchant, paymentSource: draft.paymentSource,
          });
        }
        saved.push(draft.id);
      }
    } catch {
      setMessage(saved.length ? `${saved.length} saved. Baaki save nahi hue, phir try karo.` : 'Save nahi ho paya. Phir try karo.');
    }
    // Saved entries leave the queue even on partial failure, so a retry cannot duplicate them.
    if (saved.length) {
      setGone(current => new Set([...current, ...saved]));
      await discardSms(saved).catch(() => undefined);
      notifyEntriesChanged();
    }
    setSaving(false);
    if (saved.length === items.length) onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Close SMS review" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>SMS se mile transactions</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close SMS review" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.length === 0 ? <Text variant="caption" style={styles.hint}>Koi naya transaction nahi hai.</Text> : null}
            {items.map(draft => {
              const income = draft.type === 'income';
              return (
                <View key={draft.id} style={styles.card}>
                  <CategoryIcon category={draft.category} type={draft.type} size={42} />
                  <View style={styles.cardMeta}>
                    <Text variant="label" numberOfLines={1} style={styles.cardTitle}>{titleOf(draft)}</Text>
                    <Text variant="caption" numberOfLines={1}>
                      {`${draft.category} · ${formatShortDate(dateForExpenseInput(new Date(draft.occurredAt)))}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Switch ${titleOf(draft)} to ${income ? 'expense' : 'income'}`}
                    hitSlop={6}
                    onPress={() => setFlipped(current => {
                      const next = new Set(current);
                      if (next.has(draft.id)) next.delete(draft.id);
                      else next.add(draft.id);
                      return next;
                    })}
                  >
                    <Text variant="label" style={[styles.cardAmount, income ? styles.positive : styles.negative]}>
                      {`${income ? '+' : '−'}${formatRupees(draft.amountPaise)}`}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ignore ${titleOf(draft)}`}
                    hitSlop={8}
                    onPress={() => dismiss(draft.id)}
                    style={styles.removeButton}
                  >
                    <X color={colors.textMuted} size={16} />
                  </Pressable>
                </View>
              );
            })}
            {items.length ? <Text variant="caption" style={styles.hint}>Amount par tap karke income/expense badlo. X se ignore karo.</Text> : null}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save SMS entries"
            accessibilityState={{ disabled: !items.length || saving }}
            disabled={!items.length || saving}
            onPress={save}
            style={[styles.saveButton, (!items.length || saving) && styles.saveDisabled]}
          >
            <Check color={colors.white} size={20} strokeWidth={2.8} />
            <Text variant="button" style={styles.saveText}>
              {saving ? 'Saving…' : items.length > 1 ? `Save ${items.length} entries` : 'Save entry'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(34, 31, 44, 0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: spacing.md, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  handle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radius.full, height: 5, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  message: { color: colors.destructive, textAlign: 'center' },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.sm },
  card: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: 15 },
  cardAmount: { fontSize: 16 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  removeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 26, justifyContent: 'center', width: 26 },
  hint: { textAlign: 'center' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: colors.white },
});
