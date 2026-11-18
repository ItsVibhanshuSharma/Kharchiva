import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import { Check, X } from '../../components/icons';
import { getTransactionRepository } from '../../database/transactionRepository';
import { parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';
import { colors, radius, spacing } from '../../theme';
import { categoryLook } from '../../theme/categories';
import { categoryNames, useCatalog } from '../catalog/catalogStore';
import { formatRupees } from '../../utils/money';
import { notifyEntriesChanged } from '../entries/entryEvents';

export type QuickAddType = 'expense' | 'income';

export type QuickAddScreenProps = {
  initialType: QuickAddType;
  /** Closes the quick-add window (finishes the native activity). */
  onClose: () => void;
};

/** How long the "saved" confirmation stays before the window closes. */
export const SAVED_CONFIRMATION_MS = 900;

/**
 * Small card shown over whatever app the user is in. Only amount and category are
 * required (PRD §9.2); everything else can be added later from the main app.
 */
export function QuickAddScreen({ initialType, onClose }: QuickAddScreenProps) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<QuickAddType>(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ amountPaise: number; category: string } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const catalog = useCatalog();
  const categories = categoryNames(catalog, type);
  const amountPaise = parseRupeesToPaise(amount);
  const canSave = Boolean(amountPaise && category) && !saving && !saved;

  const switchType = (next: QuickAddType) => {
    setType(next);
    setCategory(null);
    setError('');
  };

  const save = async () => {
    if (!amountPaise) {
      setError('Amount daalo.');
      return;
    }
    if (!category) {
      setError('Category chuno.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const repository = await getTransactionRepository();
      if (type === 'income') {
        await repository.createIncome({ amountPaise, category });
      } else {
        await repository.createExpense({ amountPaise, category, source: 'QUICK' });
      }
      notifyEntriesChanged();
      setSaved({ amountPaise, category });
      closeTimer.current = setTimeout(onClose, SAVED_CONFIRMATION_MS);
    } catch {
      setError('Save nahi ho paya. Phir try karo.');
    } finally {
      setSaving(false);
    }
  };

  const income = type === 'income';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Pressable accessibilityLabel="Close quick add" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {saved ? (
          <View accessibilityLiveRegion="polite" style={styles.savedBox}>
            <Text style={styles.savedEmoji}>{categoryLook(saved.category, type).emoji}</Text>
            <Text variant="heading" style={income ? styles.positive : styles.negative}>
              {`${income ? '+' : '−'}${formatRupees(saved.amountPaise)} saved`}
            </Text>
            <Text variant="muted">{saved.category}</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.segment}>
                {(['expense', 'income'] as const).map(option => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={option === 'income' ? 'Income entry' : 'Expense entry'}
                    accessibilityState={{ selected: type === option }}
                    key={option}
                    onPress={() => switchType(option)}
                    style={[styles.segmentOption, type === option && styles.segmentSelected]}
                  >
                    <Text variant="label" style={type === option ? styles.segmentTextSelected : styles.segmentText}>
                      {option === 'income' ? '+ Income' : '− Expense'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close quick add" hitSlop={10} onPress={onClose} style={styles.closeButton}>
                <X color={colors.textMuted} size={20} />
              </Pressable>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                accessibilityLabel="Quick amount"
                autoFocus
                keyboardType="decimal-pad"
                onChangeText={value => {
                  setAmount(value.replace(/[^\d.]/g, ''));
                  setError('');
                }}
                placeholder="0"
                placeholderTextColor={colors.border}
                returnKeyType="done"
                style={styles.amountInput}
                value={amount}
              />
            </View>

            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map(item => {
                const selected = category === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quick category ${item}`}
                    accessibilityState={{ selected }}
                    key={item}
                    onPress={() => {
                      setCategory(item);
                      setError('');
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <CategoryIcon category={item} type={type} size={28} inverted={selected} />
                    <Text variant="label" style={selected ? styles.chipTextSelected : styles.chipText}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quick save"
              // Stays tappable when incomplete so the user gets a hint instead of a dead button.
              accessibilityState={{ disabled: saving || Boolean(saved) }}
              disabled={saving || Boolean(saved)}
              onPress={save}
              style={[styles.saveButton, income ? styles.saveIncome : styles.saveExpense, !canSave && styles.saveDisabled]}
            >
              <Check color={colors.white} size={20} strokeWidth={2.8} />
              <Text variant="button" style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  segment: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 3 },
  segmentOption: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted },
  segmentTextSelected: { color: colors.white },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  amountRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  currency: { color: colors.text, fontSize: 36, fontWeight: '700' },
  amountInput: { color: colors.text, fontSize: 44, fontWeight: '700', minWidth: 120, padding: 0, textAlign: 'center' },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingLeft: 4,
    paddingRight: spacing.md,
    paddingVertical: 4,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.white },
  error: { color: colors.destructive, textAlign: 'center' },
  saveButton: { alignItems: 'center', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  saveExpense: { backgroundColor: colors.destructive },
  saveIncome: { backgroundColor: colors.success },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: colors.white },
  savedBox: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  savedEmoji: { fontSize: 52, lineHeight: 62 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
});
