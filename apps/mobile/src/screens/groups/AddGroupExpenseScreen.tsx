import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { CalendarPicker } from '../../components/CalendarPicker';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { CalendarDays, Check } from '../../components/icons';
import { showSnackbar } from '../../components/snackbar';
import {
  buildExpenseInput,
  formFromExpense,
  previewShares,
  splitRemainder,
  type ExpenseForm,
} from '../../features/groups/expenseForm';
import { EXPENSE_CATEGORIES, displayDate, errorMessage } from '../../features/groups/groupFormat';
import { getGroupsApi } from '../../features/groups/groupsApi';
import { SplitType } from '../../features/groups/groupMath';
import type { GroupDetail } from '../../features/groups/types';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { dateForExpenseInput } from '../expenses/expenseInputUtils';
import { Avatar, Segmented } from './groupComponents';
import { groupStyles as s } from './groupStyles';

const SPLIT_OPTIONS = [
  { value: SplitType.EQUAL, label: 'Equally' },
  { value: SplitType.EXACT, label: 'Exact amounts' },
  { value: SplitType.PERCENT, label: 'Percentages' },
] as const;

export function AddGroupExpenseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { groupId, expenseId } = useRoute<RouteProp<RootStackParamList, 'AddGroupExpense'>>().params;
  const today = dateForExpenseInput(new Date());

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [form, setForm] = useState<ExpenseForm | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getGroupsApi();
        const detail = await api.detail(groupId);
        let initial: ExpenseForm = {
          title: '',
          amountText: '',
          categoryKey: '',
          day: today,
          note: '',
          payerId: detail.myMemberId,
          splitType: SplitType.EQUAL,
          selected: detail.members.filter(member => member.status !== 'REMOVED').map(member => member.id),
          values: {},
        };
        if (expenseId) {
          const expense = (await api.listExpenses(groupId)).find(item => item.id === expenseId);
          if (!expense) throw new Error('Expense not found');
          initial = formFromExpense(expense);
        }
        if (!cancelled) {
          setGroup(detail);
          setForm(initial);
        }
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, expenseId]);

  const people = useMemo(
    () => (group ? group.members.filter(member => member.status !== 'REMOVED' || form?.selected.includes(member.id)) : []),
    [group, form?.selected],
  );

  const title = expenseId ? 'Edit expense' : 'Add expense';

  if (!group || !form) {
    return (
      <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <View style={s.headerWrap}>
          <AppHeader title={title} showBack onBack={() => navigation.goBack()} />
        </View>
        <View style={s.content}>
          {error ? <Text style={s.error}>{error}</Text> : <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} />}
        </View>
      </Screen>
    );
  }

  const patch = (changes: Partial<ExpenseForm>) => setForm(current => (current ? { ...current, ...changes } : current));
  const toggle = (id: string) =>
    patch({ selected: form.selected.includes(id) ? form.selected.filter(item => item !== id) : [...form.selected, id] });
  const allSelected = people.length > 0 && people.every(member => form.selected.includes(member.id));
  const preview = previewShares(form);
  const remainder = splitRemainder(form);

  const save = async () => {
    const result = buildExpenseInput(form);
    if (!result.ok) return setError(result.error);
    setSaving(true);
    setError('');
    try {
      const api = getGroupsApi();
      if (expenseId) await api.updateExpense(groupId, expenseId, result.input);
      else await api.createExpense(groupId, result.input);
      showSnackbar({ message: expenseId ? 'Expense updated' : 'Expense added', tone: 'success' });
      navigation.goBack();
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  };

  const summary = (() => {
    if (!preview) return '';
    const count = form.selected.length;
    const total = formatRupees(Object.values(preview).reduce((sum, value) => sum + value, 0));
    if (form.splitType === SplitType.EQUAL) {
      const each = Math.floor(Object.values(preview).reduce((sum, value) => sum + value, 0) / count);
      return `${total} split between ${count} ${count === 1 ? 'person' : 'people'} · about ${formatRupees(each)} each`;
    }
    return `${total} split between ${count} ${count === 1 ? 'person' : 'people'}`;
  })();

  const remainderText =
    remainder === null
      ? ''
      : form.splitType === SplitType.EXACT
        ? remainder === 0
          ? 'All of it is assigned'
          : remainder > 0
            ? `${formatRupees(remainder)} left to assign`
            : `${formatRupees(-remainder)} too much`
        : remainder === 0
          ? 'Adds up to 100%'
          : remainder > 0
            ? `${remainder / 100}% left`
            : `${-remainder / 100}% too much`;
  const remainderOk = remainder === 0;

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.headerWrap}>
          <AppHeader title={title} subtitle={group.title} showBack onBack={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.amountCard}>
            <Text variant="caption">{'Amount'}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                accessibilityLabel="Amount in rupees"
                placeholder="0"
                placeholderTextColor={colors.border}
                keyboardType="decimal-pad"
                value={form.amountText}
                onChangeText={value => patch({ amountText: value })}
                style={styles.amountInput}
                maxLength={12}
              />
            </View>
          </View>

          <Input
            placeholder="e.g. Hotel, Dinner, Cab"
            value={form.title}
            onChangeText={value => patch({ title: value })}
            maxLength={120}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {EXPENSE_CATEGORIES.map(category => {
              const active = form.categoryKey === category.key;
              return (
                <Pressable
                  key={category.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={category.label}
                  onPress={() => patch({ categoryKey: active ? '' : category.key })}
                  style={[styles.category, active && styles.categoryActive]}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text variant="label" style={[styles.categoryLabel, active && s.chipTextActive]}>{category.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change date"
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [styles.dateRow, pressed && s.pressed]}
          >
            <CalendarDays color={colors.primary} size={20} />
            <Text variant="label" style={[s.flex, s.name]}>{displayDate(`${form.day}T00:00:00Z`)}</Text>
            <Text variant="caption">{form.day === today ? 'Today' : 'Change'}</Text>
          </Pressable>

          <Text variant="label" style={styles.sectionLabel}>{'Paid by'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.payerRow}>
            {people.map(member => {
              const active = form.payerId === member.id;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={member.id === group.myMemberId ? `${member.displayName} (you)` : member.displayName}
                  onPress={() => patch({ payerId: member.id })}
                  style={[styles.payer, active && styles.payerActive]}
                >
                  <Avatar name={member.displayName} size={28} />
                  <Text variant="label" numberOfLines={1} style={[styles.payerName, active && s.chipTextActive]}>
                    {member.id === group.myMemberId ? 'You' : member.displayName.split(' ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text variant="label" style={styles.sectionLabel}>{'Split'}</Text>
          <Segmented options={SPLIT_OPTIONS} value={form.splitType} onChange={value => patch({ splitType: value })} />

          <View style={styles.membersCard}>
            <View style={styles.membersHeader}>
              <Text variant="caption">{`${form.selected.length} of ${people.length} people`}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={allSelected ? 'Select no one' : 'Select everyone'}
                hitSlop={8}
                onPress={() => patch({ selected: allSelected ? [] : people.map(member => member.id) })}
              >
                <Text variant="label" style={styles.selectAll}>{allSelected ? 'Clear all' : 'Select all'}</Text>
              </Pressable>
            </View>
            {people.map((member, index) => {
              const included = form.selected.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: included }}
                  accessibilityLabel={`Include ${member.displayName}`}
                  onPress={() => toggle(member.id)}
                  style={[styles.memberRow, index > 0 && styles.memberDivider, !included && styles.memberOff]}
                >
                  <Avatar name={member.displayName} size={36} />
                  <Text variant="label" numberOfLines={1} style={[s.flex, s.name]}>
                    {member.id === group.myMemberId ? `${member.displayName} (you)` : member.displayName}
                  </Text>
                  {included && form.splitType !== SplitType.EQUAL ? (
                    <View style={styles.valueBox}>
                      <TextInput
                        accessibilityLabel={`${member.displayName} ${form.splitType === SplitType.EXACT ? 'amount' : 'percent'}`}
                        placeholder={form.splitType === SplitType.EXACT ? '₹0' : '0%'}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={form.values[member.id] ?? ''}
                        onChangeText={value => patch({ values: { ...form.values, [member.id]: value } })}
                        style={styles.valueInput}
                      />
                    </View>
                  ) : included && preview ? (
                    <Text variant="label" style={styles.share}>{formatRupees(preview[member.id] ?? 0)}</Text>
                  ) : null}
                  <View style={[styles.check, included && styles.checkOn]}>{included ? <Check color={colors.white} size={14} strokeWidth={3} /> : null}</View>
                </Pressable>
              );
            })}
            {remainderText ? (
              <Text
                variant="caption"
                accessibilityLiveRegion="polite"
                style={[styles.remainder, remainderOk ? { color: colors.success } : { color: colors.destructive }]}
              >
                {remainderText}
              </Text>
            ) : null}
          </View>
          {summary ? <Text variant="caption" style={styles.summary}>{summary}</Text> : null}

          <Input
            placeholder="Add a note (optional)"
            value={form.note}
            onChangeText={value => patch({ note: value })}
            maxLength={1000}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
          <Button disabled={saving} onPress={save} accessibilityLabel="Save expense">
            {saving ? 'Saving…' : 'Save expense'}
          </Button>
        </View>
      </KeyboardAvoidingView>
      <CalendarPicker
        visible={calendarOpen}
        value={form.day}
        maxDate={today}
        onSelect={day => {
          patch({ day });
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  amountCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  amountRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  rupee: { color: colors.textMuted, fontSize: 34, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.text, fontSize: 44, fontWeight: '800', minWidth: 80, padding: 0, textAlign: 'center' },
  categoryRow: { gap: spacing.sm, paddingRight: spacing.lg },
  category: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  categoryActive: { backgroundColor: colors.selected, borderColor: colors.primary },
  categoryEmoji: { fontSize: 22 },
  categoryLabel: { color: colors.text, fontSize: 12 },
  dateRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionLabel: { color: colors.text, fontSize: 15, marginTop: spacing.xs },
  payerRow: { gap: spacing.sm, paddingRight: spacing.lg },
  payer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: spacing.md + 2,
  },
  payerActive: { backgroundColor: colors.selected, borderColor: colors.primary },
  payerName: { color: colors.text, fontSize: 13, maxWidth: 110 },
  membersCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  membersHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  selectAll: { color: colors.primary, fontSize: 13 },
  memberRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.md + 2 },
  memberDivider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  memberOff: { opacity: 0.5 },
  share: { color: colors.text, fontSize: 14 },
  check: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  valueBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, minWidth: 84, paddingHorizontal: spacing.md },
  valueInput: { color: colors.text, fontSize: 15, fontWeight: '600', paddingVertical: spacing.sm, textAlign: 'right' },
  remainder: { fontWeight: '600', paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  summary: { textAlign: 'center' },
  footer: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
