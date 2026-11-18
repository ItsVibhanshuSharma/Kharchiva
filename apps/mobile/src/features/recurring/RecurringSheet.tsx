import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPicker } from '../../components/CalendarPicker';
import { CategoryIcon } from '../../components/CategoryIcon';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { CalendarDays, Check, Trash2, X } from '../../components/icons';
import { getRecurringRepository } from '../../database/recurringRepository';
import type { RecurringFrequency, RecurringItem } from '../../database/repositories/RecurringRepository';
import { dateForExpenseInput, parseRupeesToPaise } from '../../screens/expenses/expenseInputUtils';
import { colors, radius, spacing } from '../../theme';
import { formatShortDate } from '../../utils/dates';
import { categoryNames, useCatalog } from '../catalog/catalogStore';
import { notifyEntriesChanged } from '../entries/entryEvents';
import { processRecurring } from './runRecurring';
import { FREQUENCIES, frequencyLabel } from './schedule';

type Props = { visible: boolean; editing: RecurringItem | null; onClose: () => void };

function addYear(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year + 1, month - 1, day)).toISOString().slice(0, 10);
}

export function RecurringSheet({ visible, editing, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const catalog = useCatalog();
  const today = dateForExpenseInput(new Date());
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [startDate, setStartDate] = useState(today);
  const [autoAdd, setAutoAdd] = useState(true);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKind(editing?.kind ?? 'expense');
    setName(editing?.name ?? '');
    setAmount(editing ? String(editing.amountPaise / 100) : '');
    setCategory(editing?.category ?? null);
    setFrequency(editing?.frequency ?? 'MONTHLY');
    setStartDate(editing?.startDate ?? dateForExpenseInput(new Date()));
    setAutoAdd(editing?.autoAdd ?? true);
    setError('');
    setSaving(false);
  }, [visible, editing]);

  const categories = categoryNames(catalog, kind);

  const save = async () => {
    const amountPaise = parseRupeesToPaise(amount);
    if (!name.trim()) return setError('Naam likho, jaise Rent ya Netflix.');
    if (!amountPaise) return setError('Amount daalo.');
    if (!category) return setError('Category chuno.');
    setSaving(true);
    try {
      const repository = await getRecurringRepository();
      if (editing) {
        await repository.update(editing.id, { name, amountPaise, category, autoAdd });
      } else {
        await repository.add({ kind, name, amountPaise, category, paymentSource: null, frequency, startDate, autoAdd });
      }
      // A first date of today should show up right away, not on the next app open.
      const added = await processRecurring().catch(() => []);
      notifyEntriesChanged();
      showSnackbar({ message: added.length ? `${name.trim()} save ho gaya, aaj ki entry bhi jud gayi` : `${name.trim()} save ho gaya` });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : 'Save nahi ho paya. Phir try karo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert(`${editing.name} band karein?`, 'Aage se ye apne aap nahi judega. Pehle judi entries waise hi rahengi.', [
      { text: 'Rehne do', style: 'cancel' },
      {
        text: 'Band karo',
        style: 'destructive',
        onPress: async () => {
          try {
            const repository = await getRecurringRepository();
            await repository.remove(editing.id);
            notifyEntriesChanged();
            showSnackbar({ message: `${editing.name} band kar diya` });
            onClose();
          } catch {
            showSnackbar({ tone: 'error', message: 'Band nahi ho paya. Phir try karo.' });
          }
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close recurring" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>{editing ? editing.name : 'Naya recurring'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close recurring" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!editing ? (
              <View style={styles.segment}>
                {(['expense', 'income'] as const).map(option => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={option === 'income' ? 'Recurring income' : 'Recurring expense'}
                    accessibilityState={{ selected: kind === option }}
                    key={option}
                    onPress={() => {
                      setKind(option);
                      setCategory(null);
                    }}
                    style={[styles.segmentOption, kind === option && styles.segmentSelected]}
                  >
                    <Text variant="label" style={kind === option ? styles.whiteText : styles.text}>{option === 'income' ? '+ Income' : '− Expense'}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <TextInput
              accessibilityLabel="Recurring name"
              maxLength={30}
              onChangeText={value => { setName(value); setError(''); }}
              placeholder={kind === 'income' ? 'Jaise: Salary' : 'Jaise: Rent, Netflix, EMI'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
            />
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                accessibilityLabel="Recurring amount"
                keyboardType="decimal-pad"
                onChangeText={value => { setAmount(value.replace(/[^\d.]/g, '')); setError(''); }}
                placeholder="0"
                placeholderTextColor={colors.border}
                style={styles.amountInput}
                value={amount}
              />
            </View>

            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map(item => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Recurring category ${item}`}
                  accessibilityState={{ selected: category === item }}
                  key={item}
                  onPress={() => { setCategory(item); setError(''); }}
                  style={[styles.chip, category === item && styles.chipSelected]}
                >
                  <CategoryIcon category={item} type={kind} size={26} inverted={category === item} />
                  <Text variant="label" style={category === item ? styles.whiteText : styles.text}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {editing ? (
              <Text variant="caption">{`${frequencyLabel(editing.frequency)} · agli date ${formatShortDate(editing.nextDate)}`}</Text>
            ) : (
              <>
                <View style={styles.chips}>
                  {FREQUENCIES.map(item => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Frequency ${item.label}`}
                      accessibilityState={{ selected: frequency === item.id }}
                      key={item.id}
                      onPress={() => setFrequency(item.id)}
                      style={[styles.chip, frequency === item.id && styles.chipSelected]}
                    >
                      <Text variant="label" style={frequency === item.id ? styles.whiteText : styles.text}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Choose first date" onPress={() => setPicking(true)} style={styles.dateField}>
                  <CalendarDays color={colors.primary} size={18} />
                  <Text variant="label" style={styles.text}>{`Pehli baar: ${formatShortDate(startDate)}`}</Text>
                </Pressable>
              </>
            )}

            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text variant="label" style={styles.text}>Apne aap jodo</Text>
                <Text variant="caption">{autoAdd ? 'Date aate hi entry ban jayegi' : 'Home par poochhenge: jodo ya skip'}</Text>
              </View>
              <Switch
                accessibilityLabel="Add automatically"
                onValueChange={setAutoAdd}
                thumbColor={colors.white}
                trackColor={{ false: '#D8D4DD', true: colors.primary }}
                value={autoAdd}
              />
            </View>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            {editing ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Stop recurring" onPress={remove} style={styles.deleteButton}>
                <Trash2 color={colors.destructive} size={20} />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Save recurring" disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>
              <Check color={colors.white} size={20} strokeWidth={2.8} />
              <Text variant="button" style={styles.whiteText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <CalendarPicker
        maxDate={addYear(today)}
        minDate={today}
        onClose={() => setPicking(false)}
        onSelect={date => { setStartDate(date); setPicking(false); }}
        value={startDate}
        visible={picking}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(34, 31, 44, 0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: spacing.md, maxHeight: '92%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  body: { gap: spacing.md },
  segment: { alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 3 },
  segmentOption: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  segmentSelected: { backgroundColor: colors.primary },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, color: colors.text, fontSize: 17, minHeight: 50, paddingHorizontal: spacing.md },
  amountRow: { alignItems: 'center', flexDirection: 'row' },
  currency: { color: colors.text, fontSize: 28, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.text, flex: 1, fontSize: 30, fontWeight: '700', padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text },
  whiteText: { color: colors.white },
  dateField: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  error: { color: colors.destructive },
  actions: { flexDirection: 'row', gap: spacing.md },
  deleteButton: { alignItems: 'center', borderColor: colors.destructive, borderRadius: radius.lg, borderWidth: 1.5, height: 54, justifyContent: 'center', width: 54 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flex: 1, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
