import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { Check, Trash2, X } from '../../components/icons';
import { TOTAL_BUDGET, type Budget } from '../../database/repositories/CatalogRepository';
import { parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';
import { colors, radius, spacing } from '../../theme';
import { categoryNames, removeBudget, setBudget, useCatalog } from '../catalog/catalogStore';
import { budgetLabel } from './budgetProgress';

export type BudgetSheetProps = {
  visible: boolean;
  /** Edit this budget; when absent the sheet adds a new one. */
  editing?: Budget | null;
  onClose: () => void;
};

export function BudgetSheet({ visible, editing, onClose }: BudgetSheetProps) {
  const insets = useSafeAreaInsets();
  const catalog = useCatalog();
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCategory(editing?.category ?? null);
    setAmount(editing ? String(editing.limitPaise / 100) : '');
    setError('');
    setSaving(false);
  }, [visible, editing]);

  // Offer only categories without a budget yet; "Sab kharche" covers everything.
  const taken = new Set(catalog.budgets.map(budget => budget.category.toLowerCase()));
  const options = [TOTAL_BUDGET, ...categoryNames(catalog, 'expense')].filter(item => !taken.has(item.toLowerCase()));

  const save = async () => {
    const limitPaise = parseRupeesToPaise(amount);
    if (!category) {
      setError('Category chuno.');
      return;
    }
    if (!limitPaise) {
      setError('Mahine ki limit daalo, jaise 8000.');
      return;
    }
    setSaving(true);
    try {
      await setBudget(category, limitPaise);
      showSnackbar({ message: `${budgetLabel(category)} budget save ho gaya` });
      onClose();
    } catch {
      setError('Save nahi ho paya. Phir try karo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert(`${budgetLabel(editing.category)} budget hatayein?`, 'Aapki entries par koi asar nahi padega.', [
      { text: 'Rehne do', style: 'cancel' },
      {
        text: 'Hatao',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBudget(editing.id);
            showSnackbar({ message: 'Budget hata diya' });
            onClose();
          } catch {
            showSnackbar({ tone: 'error', message: 'Budget hat nahi paya. Phir try karo.' });
          }
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close budget" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>
              {editing ? `${budgetLabel(editing.category)} budget` : 'Naya budget'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close budget" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {!editing ? (
            <>
              <Text variant="label" style={styles.label}>KIS PAR LIMIT?</Text>
              <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {options.map(item => {
                  const selected = category === item;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Budget category ${budgetLabel(item)}`}
                      accessibilityState={{ selected }}
                      key={item}
                      onPress={() => {
                        setCategory(item);
                        setError('');
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      {item === TOTAL_BUDGET ? null : <CategoryIcon category={item} type="expense" size={26} inverted={selected} />}
                      <Text variant="label" style={selected ? styles.chipTextSelected : styles.chipText}>{budgetLabel(item)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <Text variant="label" style={styles.label}>HAR MAHINE KI LIMIT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              accessibilityLabel="Budget limit"
              autoFocus={Boolean(editing)}
              keyboardType="decimal-pad"
              onChangeText={value => {
                setAmount(value.replace(/[^\d.]/g, ''));
                setError('');
              }}
              placeholder="8000"
              placeholderTextColor={colors.border}
              style={styles.amountInput}
              value={amount}
            />
          </View>
          <Text variant="caption">Har mahine ki 1 tareekh se naye sire se ginti hoti hai.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {editing ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Delete budget" onPress={remove} style={styles.deleteButton}>
                <Trash2 color={colors.destructive} size={20} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save budget"
              disabled={saving}
              onPress={save}
              style={[styles.saveButton, saving && styles.disabled]}
            >
              <Check color={colors.white} size={20} strokeWidth={2.8} />
              <Text variant="button" style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
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
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  label: { color: colors.textMuted, letterSpacing: 0.6 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.white },
  amountRow: { alignItems: 'center', flexDirection: 'row' },
  currency: { color: colors.text, fontSize: 30, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.text, flex: 1, fontSize: 32, fontWeight: '700', padding: 0 },
  error: { color: colors.destructive },
  actions: { flexDirection: 'row', gap: spacing.md },
  deleteButton: { alignItems: 'center', borderColor: colors.destructive, borderRadius: radius.lg, borderWidth: 1.5, height: 54, justifyContent: 'center', width: 54 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flex: 1, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  saveText: { color: colors.white },
});
