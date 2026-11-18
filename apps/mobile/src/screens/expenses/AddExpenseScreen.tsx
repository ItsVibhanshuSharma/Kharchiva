import React, {useEffect, useState} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { CalendarPicker } from '../../components/CalendarPicker';
import { CategoryIcon } from '../../components/CategoryIcon';
import { celebrate } from '../../components/celebration';
import { showSnackbar } from '../../components/snackbar';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { bottomSafeAreaInset, fixedFooterContentInset } from '../../components/layoutInsets';
import type { EntryType, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../theme/categories';
import { getTransactionRepository } from '../../database/transactionRepository';
import { dateForExpenseInput, describeDateInput, expenseDateToIso, parseRupeesToPaise, shiftDateInput } from './expenseInputUtils';

const expenseCategories: readonly string[] = EXPENSE_CATEGORIES;
const incomeCategories: readonly string[] = INCOME_CATEGORIES;
const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card'];
const SAVE_BUTTON_HEIGHT = 56;
const SAVE_FOOTER_TOP_SPACING = spacing.md;
const CONTENT_CLEARANCE_SPACING = spacing.xl;

type AddExpenseScreenProps = {
  /** `editId` switches the form into edit mode for an existing entry of `type`. */
  route?: { params?: { type?: EntryType; editId?: string } };
};

export function AddExpenseScreen({ route }: AddExpenseScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const footerBottomInset = bottomSafeAreaInset(insets.bottom);
  const scrollBottomClearance = fixedFooterContentInset(
    SAVE_BUTTON_HEIGHT + SAVE_FOOTER_TOP_SPACING,
    insets.bottom,
    CONTENT_CLEARANCE_SPACING,
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const editId = route?.params?.editId;
  const isEditing = Boolean(editId);
  const [entryType, setEntryType] = useState<EntryType>(route?.params?.type ?? 'expense');
  const isIncome = entryType === 'income';
  const categories = isIncome ? incomeCategories : expenseCategories;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [sourceName, setSourceName] = useState('');
  const [paymentSource, setPaymentSource] = useState(paymentMethods[0]);
  const [merchant, setMerchant] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => dateForExpenseInput(new Date()));
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');
  const today = dateForExpenseInput(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(isEditing);
  const [original, setOriginal] = useState<{ date: string; occurredAt: string } | null>(null);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const repository = await getTransactionRepository();
        const record = await repository.getById(editId, entryType);
        if (cancelled) return;
        if (!record) {
          setLoadError('This entry no longer exists.');
          return;
        }
        const date = dateForExpenseInput(new Date(record.occurredAt));
        setAmount((record.amountPaise / 100).toFixed(record.amountPaise % 100 === 0 ? 0 : 2));
        setCategory(record.category);
        setExpenseDate(date);
        setNote(record.note ?? '');
        if (record.type === 'expense') {
          setMerchant(record.merchant ?? '');
          setPaymentSource(record.paymentSource ?? '');
        } else {
          setSourceName(record.sourceName ?? '');
        }
        setOriginal({ date, occurredAt: record.occurredAt });
      } catch {
        if (!cancelled) setLoadError('Could not load this entry. Please go back and try again.');
      } finally {
        if (!cancelled) setLoadingEntry(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // entryType is fixed while editing, so editId is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Keep a saved category or payment source visible even if it is not a default chip.
  const categoryOptions = categories.includes(category) || !category ? categories : [category, ...categories];
  const paymentOptions = paymentMethods.includes(paymentSource) || !paymentSource ? paymentMethods : [paymentSource, ...paymentMethods];

  const confirmDelete = () => {
    if (!editId) return;
    Alert.alert(
      `Delete this ${isIncome ? 'income' : 'expense'}?`,
      'It will be removed from your totals on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            (async () => {
              try {
                const repository = await getTransactionRepository();
                await repository.deleteTransaction(editId, entryType);
                showSnackbar({ message: `${isIncome ? 'Income' : 'Expense'} delete ho gaya` });
                navigation.goBack();
              } catch {
                showSnackbar({ tone: 'error', message: 'Delete nahi ho paya. Phir try karo.' });
              }
            })();
          },
        },
      ],
    );
  };

  const switchType = (next: EntryType) => {
    if (next === entryType) return;
    setEntryType(next);
    setCategory((next === 'income' ? incomeCategories : expenseCategories)[0]);
    setValidationError('');
    setLoadError('');
  };

  const saveExpense = async () => {
    const amountPaise = parseRupeesToPaise(amount);
    // When editing and the date is unchanged, keep the original timestamp exactly.
    const occurredAt = original && expenseDate === original.date
      ? original.occurredAt
      : expenseDateToIso(expenseDate, original ? new Date(original.occurredAt) : new Date());
    if (!amountPaise) {
      setValidationError('Enter an amount greater than ₹0, with up to two decimal places.');
      return;
    }
    if (!category.trim()) {
      setValidationError('Choose a category.');
      return;
    }
    if (!occurredAt) {
      setValidationError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (expenseDate.trim() > dateForExpenseInput(new Date())) {
      setValidationError('Date cannot be in the future.');
      return;
    }
    setValidationError('');
    setLoadError('');
    setSaving(true);
    try {
      const repository = await getTransactionRepository();
      if (editId && isIncome) {
        await repository.updateIncome(editId, { amountPaise, category, occurredAt, sourceName, note });
      } else if (editId) {
        await repository.updateExpense(editId, { amountPaise, category, occurredAt, merchant, paymentSource, note });
      } else if (isIncome) {
        await repository.createIncome({
          amountPaise,
          category,
          occurredAt,
          sourceName,
          note,
        });
      } else {
        await repository.createExpense({
          amountPaise,
          category,
          occurredAt,
          merchant,
          paymentSource,
          note,
        });
      }
      // New entries get the celebration; edits get a quiet confirmation.
      if (editId) showSnackbar({ message: 'Changes save ho gaye' });
      else celebrate({ type: entryType, category, amountPaise });
      navigation.goBack();
    } catch {
      showSnackbar({ tone: 'error', message: 'Save nahi ho paya. Phir try karo.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AppHeader
          title={`${isEditing ? 'Edit' : 'Add'} ${isIncome ? 'Income' : 'Expense'}`}
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollBottomClearance },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type cannot change while editing: income and expenses are stored separately. */}
          {!isEditing ? (
          <View style={styles.typeToggle}>
            {(['expense', 'income'] as const).map(option => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option === 'income' ? 'Income entry' : 'Expense entry'}
                accessibilityState={{ selected: entryType === option }}
                key={option}
                onPress={() => switchType(option)}
                style={[styles.typeOption, entryType === option && styles.typeOptionSelected]}
              >
                <Text variant="label" style={entryType === option ? styles.typeTextSelected : styles.typeText}>
                  {option === 'income' ? '+  Income' : '−  Expense'}
                </Text>
              </Pressable>
            ))}
          </View>
          ) : null}
          <Card style={styles.amountCard}>
            <Text variant="caption" style={styles.amountLabel}>{isIncome ? 'RECEIVED AMOUNT' : 'SPENT AMOUNT'}</Text>
            <View style={styles.amountEntry}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                accessibilityLabel={isIncome ? 'Income amount' : 'Expense amount'}
                keyboardType="decimal-pad"
                onChangeText={value => setAmount(value.replace(/[^\d.]/g, ''))}
                placeholder="0"
                style={styles.amountInput}
                value={amount}
              />
            </View>
            <View style={styles.amountChips}>
              {['+₹50', '+₹100', '+₹500', '+₹1,000'].map(value => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Add ${value.slice(1)} to amount`} key={value} onPress={() => setAmount(String((Number(amount) || 0) + Number(value.slice(2).replace(',', ''))))} style={styles.amountChipButton}>
                  <Text variant="label" style={styles.amountChip}>{value}</Text>
                </Pressable>
              ))}
            </View>
            {validationError ? <Text accessibilityLiveRegion="polite" style={styles.validationError}>{validationError}</Text> : null}
          </Card>

          <View style={styles.categoryWrap}>
            <View style={styles.sectionHeader}>
              <Text variant="label" style={styles.categoryLabel}>CATEGORY</Text>
              <Text variant="label" style={styles.selectedLabel}>{category}</Text>
            </View>
            <View style={styles.categoryList}>
              {categoryOptions.map(item => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Category ${item}`}
                  accessibilityState={{selected: category === item}}
                  key={item}
                  style={[
                    styles.categoryCard,
                    category === item && styles.selectedCategory,
                  ]}
                  onPress={() => {setCategory(item); setValidationError('');}}
                >
                  <CategoryIcon category={item} type={entryType} size={48} inverted={category === item} />
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={[styles.categoryText, category === item && styles.selectedCategoryText]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {!isIncome ? (
          <View style={styles.paymentSection}>
            <View style={styles.sectionHeader}>
              <Text variant="label" style={styles.categoryLabel}>PAID THROUGH</Text>
              <Text variant="caption">{paymentSource}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.paymentList}>
                {paymentOptions.map(method => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Payment source ${method}`}
                    accessibilityState={{selected: paymentSource === method}}
                    key={method}
                    onPress={() => setPaymentSource(method)}
                    style={[styles.paymentChip, paymentSource === method && styles.selectedPayment]}
                  >
                    <Text variant="label" style={[styles.paymentChipText, paymentSource === method && styles.selectedPaymentText]}>{method}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          ) : null}
          <Card style={styles.detailsCard}>
            {isIncome ? (
              <Input accessibilityLabel="Income source" label="Source" onChangeText={setSourceName} placeholder="Optional, e.g. Company" value={sourceName} />
            ) : (
              <Input accessibilityLabel="Merchant" label="Merchant" onChangeText={setMerchant} placeholder="Optional merchant" value={merchant} />
            )}
            <View style={styles.detailDivider} />
            <View style={styles.dateBlock}>
              <Text variant="caption">Date</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open calendar"
                onPress={() => setCalendarOpen(true)}
                style={styles.dateField}
              >
                <Text accessibilityLabel="Selected date" variant="label" style={styles.dateValue}>{describeDateInput(expenseDate, new Date())}</Text>
                <Text style={styles.dateIcon}>📅</Text>
              </Pressable>
              <View style={styles.dateChips}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Yesterday', days: -1 },
                ].map(chip => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Date ${chip.label}`}
                    key={chip.label}
                    onPress={() => { setExpenseDate(shiftDateInput(today, chip.days) ?? today); setValidationError(''); }}
                    style={styles.dateChip}
                  >
                    <Text variant="caption" style={styles.dateChipText}>{chip.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.detailDivider} />
            <Input accessibilityLabel="Expense note" label="Note" onChangeText={setNote} placeholder="Optional note" value={note} />
          </Card>

        </ScrollView>
        <View style={[styles.actions, { paddingBottom: footerBottomInset }]}>
          {loadError ? <Text accessibilityLiveRegion="polite" style={styles.validationError}>{loadError}</Text> : null}
          <View style={styles.footerRow}>
            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
                disabled={saving || loadingEntry}
                onPress={confirmDelete}
                style={styles.deleteButton}
              >
                <Text variant="button" style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
            <Button
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Save changes' : isIncome ? 'Save Income' : 'Save Expense'}
              disabled={saving || loadingEntry || !!(isEditing && !original)}
              onPress={saveExpense}
              style={[styles.saveButton, styles.flex]}
            >
              {saving ? 'Saving…' : isEditing ? '✓  Save changes' : isIncome ? '✓  Save Income' : '✓  Save Expense'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
      <CalendarPicker
        maxDate={today}
        onClose={() => setCalendarOpen(false)}
        onSelect={date => {
          setExpenseDate(date);
          setValidationError('');
          setCalendarOpen(false);
        }}
        value={expenseDate}
        visible={calendarOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 0 },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  typeToggle: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: 4,
  },
  typeOption: { alignItems: 'center', borderRadius: radius.full, flex: 1, paddingVertical: spacing.md },
  typeOptionSelected: { backgroundColor: colors.primary },
  typeText: { color: colors.text },
  typeTextSelected: { color: colors.white },
  amountCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
  },
  amountLabel: { alignSelf: 'flex-start', fontWeight: '600' },
  amountEntry: {alignItems: 'center', flexDirection: 'row', marginVertical: spacing.sm},
  currencySymbol: {color: colors.text, fontSize: 36, fontWeight: '700'},
  amountInput: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 52,
    minWidth: 130,
    padding: 0,
    textAlign: 'center',
  },
  amountChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  amountChipButton: {borderRadius: radius.full},
  amountChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    color: colors.text,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryWrap: { marginBottom: spacing.lg },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  categoryLabel: { color: colors.textMuted, letterSpacing: 0.6 },
  selectedLabel: { color: colors.primary },
  categoryList: { columnGap: '2.3%', flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    // Fixed width so a lone last tile (e.g. Rent) doesn't stretch across the row.
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 104,
    width: '31.8%',
    padding: spacing.sm,
  },
  selectedCategory: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: { color: colors.text, fontSize: 14, lineHeight: 18 },
  selectedCategoryText: { color: colors.white },
  paymentSection: { marginBottom: spacing.lg },
  paymentList: { flexDirection: 'row', gap: spacing.sm },
  paymentChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paymentChipText: {color: colors.text},
  selectedPayment: { backgroundColor: colors.text, borderColor: colors.text },
  selectedPaymentText: {color: colors.white},
  detailsCard: { borderRadius: radius.xl, gap: spacing.md, padding: spacing.lg },
  dateBlock: { gap: spacing.sm },
  dateField: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  dateIcon: { fontSize: 20 },
  dateValue: { color: colors.text, fontSize: 16 },
  dateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dateChipText: { color: colors.text },
  detailDivider: { backgroundColor: colors.border, height: 1 },
  validationError: {color: colors.destructive, fontSize: 13, marginBottom: spacing.sm, textAlign: 'center'},
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: SAVE_FOOTER_TOP_SPACING,
  },
  saveButton: { height: SAVE_BUTTON_HEIGHT },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.destructive,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    height: SAVE_BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  deleteText: { color: colors.destructive },
});
