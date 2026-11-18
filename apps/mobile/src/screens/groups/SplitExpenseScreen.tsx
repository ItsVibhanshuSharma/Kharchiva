import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {bottomSafeAreaInset} from '../../components/layoutInsets';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing, typography} from '../../theme';
import {
  groupParticipants,
  splitCategories,
  splitDates,
  splitExpenseMock,
  splitGroups,
  splitModes,
  suggestedParticipants,
  type ParticipantTone,
  type SplitMode,
  type SplitParticipant,
} from './splitExpenseData';
import {allocateWeightedCents, calculateSplit, formatINR, parseRupeesToPaise} from './splitCalculator';

type PickerKind = 'date' | 'group' | 'payer' | 'category' | 'group-members' | 'contacts';
type PickerOption = {id: string; label: string; detail?: string};
type FieldErrors = Partial<Record<'description' | 'amount' | 'date' | 'group' | 'payer' | 'participants' | 'split', string>>;

function sanitizeDecimal(value: string, places = 2) {
  const normalized = value.replace(/[^\d.]/g, '');
  const separator = normalized.indexOf('.');
  if (separator < 0) {
    return normalized;
  }
  return `${normalized.slice(0, separator)}.${normalized.slice(separator + 1).replace(/\./g, '').slice(0, places)}`;
}

function formatAmountForDisplay(value: string) {
  if (!value) {
    return '';
  }
  const [whole, fraction] = value.split('.');
  const formattedWhole = Number(whole || '0').toLocaleString('en-IN');
  return fraction === undefined ? formattedWhole : `${formattedWhole}.${fraction}`;
}

function percentDefaults(count: number) {
  if (!count) {
    return [];
  }
  return allocateWeightedCents(10000, Array.from({length: count}, () => 1))
    .map(value => (value / 100).toFixed(2));
}

function amountDefaults(totalPaise: number, count: number) {
  return allocateWeightedCents(totalPaise, Array.from({length: count}, () => 1))
    .map(value => (value / 100).toFixed(2));
}

function toneStyle(tone: ParticipantTone) {
  switch (tone) {
    case 'green': return styles.avatarGreen;
    case 'amber': return styles.avatarAmber;
    case 'neutral': return styles.avatarNeutral;
    case 'violet': return styles.avatarViolet;
  }
}

export function SplitExpenseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [description, setDescription] = useState<string>(splitExpenseMock.title);
  const [amount, setAmount] = useState<string>(splitExpenseMock.amount);
  const [amountFocused, setAmountFocused] = useState(false);
  const [date, setDate] = useState<string>(splitExpenseMock.date);
  const [group, setGroup] = useState<string>(splitExpenseMock.groupName);
  const [payerId, setPayerId] = useState<string>(splitExpenseMock.payerId);
  const [category, setCategory] = useState<string>(splitExpenseMock.category);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [participants, setParticipants] = useState<SplitParticipant[]>(
    groupParticipants.slice(0, 4),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<string>(splitExpenseMock.note);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState('');

  const totalPaise = parseRupeesToPaise(amount);
  const participantIds = participants.map(person => person.id);
  const equalShares = amountDefaults(totalPaise, participants.length);
  const evenPercentages = percentDefaults(participants.length);
  const effectiveValues = Object.fromEntries(participants.map((person, index) => [
    person.id,
    splitValues[person.id] ?? (mode === 'exact' ? equalShares[index] : evenPercentages[index]),
  ]));
  const calculation = calculateSplit(totalPaise, participantIds, mode, effectiveValues);
  const percentageTotal = participants.reduce(
    (sum, person, index) => sum + Number(effectiveValues[person.id] ?? evenPercentages[index] ?? 0),
    0,
  );
  const percentageRemaining = Math.round((100 - percentageTotal) * 100) / 100;
  const splitIsValid = totalPaise > 0 && participants.length > 0 && (mode === 'percent'
    ? Math.abs(percentageRemaining) < 0.001 && calculation.exactMatch
    : calculation.exactMatch);
  const payer = participants.find(person => person.id === payerId) ?? participants[0];

  const pickerOptions = useMemo<PickerOption[]>(() => {
    switch (picker) {
      case 'date':
        return splitDates.map(value => ({id: value, label: value}));
      case 'group':
        return splitGroups.map(value => ({id: value, label: value}));
      case 'payer':
        return participants.map(person => ({id: person.id, label: person.name, detail: person.isCurrentUser ? 'You' : undefined}));
      case 'category':
        return splitCategories.map(value => ({id: value, label: value}));
      case 'group-members':
        return groupParticipants
          .filter(person => !participants.some(existing => existing.id === person.id))
          .map(person => ({id: person.id, label: person.name, detail: 'Group member'}));
      case 'contacts':
        return suggestedParticipants
          .filter(person => !participants.some(existing => existing.id === person.id))
          .map(person => ({id: person.id, label: person.name, detail: 'Contact'}));
      default:
        return [];
    }
  }, [picker, participants]);

  const pickerTitle = picker === 'date' ? 'Choose date'
    : picker === 'group' ? 'Choose group'
      : picker === 'payer' ? 'Paid by'
        : picker === 'category' ? 'Choose category'
          : picker === 'group-members' ? 'Add from Goa Beach Retreat'
            : 'Add participant';

  const clearFieldError = (field: keyof FieldErrors) => {
    setErrors(current => ({...current, [field]: undefined}));
    setFeedback('');
  };

  const applyPickerOption = (option: PickerOption) => {
    if (picker === 'date') {
      setDate(option.label);
      clearFieldError('date');
    } else if (picker === 'group') {
      setGroup(option.label);
      clearFieldError('group');
    } else if (picker === 'payer') {
      setPayerId(option.id);
      clearFieldError('payer');
    } else if (picker === 'category') {
      setCategory(option.label);
    } else {
      const available = picker === 'group-members' ? groupParticipants : suggestedParticipants;
      const selectedPerson = available.find(person => person.id === option.id);
      if (selectedPerson) {
        setParticipants(current => [...current, selectedPerson]);
        setSplitValues({});
        setErrors(current => ({...current, participants: undefined}));
        setFeedback('');
      }
    }
    setPicker(null);
  };

  const removeParticipant = (person: SplitParticipant) => {
    if (participants.length <= 1) {
      setErrors(current => ({...current, participants: 'Keep at least one participant in the split.'}));
      return;
    }
    const nextParticipants = participants.filter(item => item.id !== person.id);
    setParticipants(nextParticipants);
    setSplitValues({});
    if (payerId === person.id) {
      setPayerId(nextParticipants[0].id);
    }
    clearFieldError('participants');
  };

  const selectMode = (nextMode: SplitMode) => {
    setMode(nextMode);
    setSplitValues({});
    setErrors(current => ({...current, split: undefined}));
    setFeedback('');
  };

  const createMockSplit = () => {
    const nextErrors: FieldErrors = {};
    if (!description.trim()) {
      nextErrors.description = 'Enter an expense description.';
    }
    if (totalPaise <= 0) {
      nextErrors.amount = 'Enter an amount greater than ₹0.';
    }
    if (!date) {
      nextErrors.date = 'Choose a date.';
    }
    if (!group) {
      nextErrors.group = 'Choose a group.';
    }
    if (!payer || !participantIds.includes(payer.id)) {
      nextErrors.payer = 'Choose a participant who is included in this split.';
    }
    if (!participants.length) {
      nextErrors.participants = 'Add at least one participant.';
    }
    if (!splitIsValid) {
      nextErrors.split = mode === 'percent'
        ? 'Participant percentages must add up to 100%.'
        : 'Participant amounts must match the total.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setFeedback('Review the highlighted fields before creating this split.');
      return;
    }

    setErrors({});
    setFeedback('Preview created locally. Nothing was sent to a server.');
  };

  const updateSplitValue = (participantId: string, value: string) => {
    setSplitValues(current => ({...current, [participantId]: sanitizeDecimal(value)}));
    setErrors(current => ({...current, split: undefined}));
    setFeedback('');
  };

  const splitMessage = mode === 'percent'
    ? percentageRemaining === 0
      ? 'Percentages add up to 100%.'
      : percentageRemaining > 0
        ? `${percentageRemaining.toFixed(2)}% remaining`
        : `${Math.abs(percentageRemaining).toFixed(2)}% over 100%`
    : calculation.remainingCents === 0
      ? 'Exact amounts match the total.'
      : calculation.remainingCents > 0
        ? `${formatINR(calculation.remainingCents)} unallocated`
        : `${formatINR(Math.abs(calculation.remainingCents))} over total`;
  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
        style={styles.flex}
      >
        <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.sm)}]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>Split Expense</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <Text style={styles.profileGlyph}>♙</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Expense Details</Text>

            <View style={styles.descriptionRow}>
              <View style={styles.descriptionIcon}><Text style={styles.descriptionGlyph}>🍴</Text></View>
              <View style={[styles.descriptionField, errors.description && styles.invalidField]}>
                <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
                <View style={styles.descriptionInputRow}>
                  <TextInput
                    accessibilityLabel="Expense description"
                    onChangeText={value => {setDescription(value); clearFieldError('description');}}
                    placeholder="e.g. Dinner at Fisherman’s Wharf"
                    placeholderTextColor={colors.textMuted}
                    style={styles.descriptionInput}
                    value={description}
                  />
                  {description ? <Pressable accessibilityRole="button" accessibilityLabel="Clear description" onPress={() => {setDescription(''); clearFieldError('description');}}><Text style={styles.clearGlyph}>×</Text></Pressable> : null}
                </View>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldCard, errors.amount && styles.invalidField]}>
                <Text style={styles.fieldLabel}>Amount <Text style={styles.required}>*</Text></Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <TextInput
                    accessibilityLabel="Expense amount"
                    keyboardType="decimal-pad"
                    onBlur={() => setAmountFocused(false)}
                    onChangeText={value => {setAmount(sanitizeDecimal(value)); clearFieldError('amount');}}
                    onFocus={() => setAmountFocused(true)}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                    style={styles.amountInput}
                    value={amountFocused ? amount : formatAmountForDisplay(amount)}
                  />
                </View>
              </View>
              <SelectorField
                accessibilityLabel="Choose date"
                error={errors.date}
                label="Date"
                onPress={() => setPicker('date')}
                required
                value={date}
                icon="▦"
              />
            </View>

            <SelectorField
              accessibilityLabel="Choose group"
              error={errors.group}
              icon="🏖️"
              label="Group"
              onPress={() => setPicker('group')}
              required
              value={group}
              wide
            />

            <View style={styles.fieldRow}>
              <SelectorField
                accessibilityLabel="Choose payer"
                error={errors.payer}
                icon={payer?.initials ?? 'R'}
                label="Paid by"
                onPress={() => setPicker('payer')}
                required
                value={payer ? `${payer.name}${payer.isCurrentUser ? ' (You)' : ''}` : ''}
              />
              <SelectorField
                accessibilityLabel="Choose category"
                icon="🍴"
                label="Category"
                onPress={() => setPicker('category')}
                value={category}
              />
            </View>
            {Object.values(errors).some(Boolean) && !feedback ? <Text style={styles.inlineError}>{Object.values(errors).find(Boolean)}</Text> : null}
          </Card>

          <Card style={styles.splitTypeCard}>
            <Text style={styles.sectionTitle}>Split Type</Text>
            <View style={styles.modeList}>
              {splitModes.map(splitMode => {
                const selectedMode = mode === splitMode.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={splitMode.label}
                    accessibilityState={{selected: selectedMode}}
                    key={splitMode.id}
                    onPress={() => selectMode(splitMode.id)}
                    style={[styles.modeButton, selectedMode && styles.modeButtonSelected]}
                  >
                    <Text style={[styles.modeIcon, selectedMode && styles.modeTextSelected]}>{splitMode.icon}</Text>
                    <Text numberOfLines={1} style={[styles.modeText, selectedMode && styles.modeTextSelected]}>{splitMode.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={styles.participantsCard}>
            <View style={styles.participantsHeading}>
              <Text style={styles.sectionTitle}>Add Participants</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Add from Group" onPress={() => setPicker('group-members')} style={styles.addFromGroup}>
                <Text style={styles.addFromGroupIcon}>♧</Text>
                <Text style={styles.addFromGroupText}>Add from Group</Text>
              </Pressable>
            </View>

            {participants.map(person => {
              const sharePaise = calculation.shares[person.id] ?? 0;
              const percent = totalPaise > 0 ? (sharePaise / totalPaise) * 100 : 0;
              return (
                <View key={person.id} style={styles.participantRow}>
                  <Text style={styles.dragHandle}>⠿</Text>
                  <View style={[styles.avatar, toneStyle(person.tone)]}><Text style={styles.avatarInitials}>{person.initials}</Text></View>
                  <View style={styles.participantInfo}>
                    <Text numberOfLines={1} style={styles.participantName}>{person.name}{person.isCurrentUser ? ' (You)' : ''}</Text>
                  </View>
                  {mode === 'equal' ? <Text style={styles.participantShare}>{formatINR(sharePaise)}</Text> : (
                    <View style={styles.customShareLine}>
                        <Text style={styles.customSharePrefix}>{mode === 'exact' ? '₹' : ''}</Text>
                        <TextInput
                          accessibilityLabel={`${person.name} ${mode === 'exact' ? 'exact amount' : 'percentage'}`}
                          keyboardType="decimal-pad"
                          onChangeText={value => updateSplitValue(person.id, value)}
                          selectTextOnFocus
                          style={styles.customShareInput}
                          value={effectiveValues[person.id] ?? ''}
                        />
                        {mode === 'percent' ? <Text style={styles.percentSuffix}>%</Text> : null}
                    </View>
                  )}
                  {mode === 'percent' ? <Text style={styles.shareSubtext}>{formatINR(sharePaise)} · {percent.toFixed(0)}% share</Text> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${person.name}`} onPress={() => removeParticipant(person)} style={styles.removeButton}>
                    <Text style={styles.removeGlyph}>×</Text>
                  </Pressable>
                </View>
              );
            })}

            {mode !== 'equal' ? (
              <View style={[styles.splitStatus, splitIsValid ? styles.splitStatusValid : styles.splitStatusAttention]}>
                <Text style={[styles.splitStatusGlyph, splitIsValid ? styles.splitStatusGlyphValid : styles.splitStatusGlyphAttention]}>{splitIsValid ? '✓' : '!'}</Text>
                <Text accessibilityLiveRegion="polite" style={styles.splitStatusText}>
                  {mode === 'exact' ? `${formatINR(calculation.allocatedCents)} allocated · ` : `${percentageTotal.toFixed(2)}% assigned · `}
                  {splitMessage}
                </Text>
              </View>
            ) : null}
            {errors.participants || errors.split ? <Text style={styles.inlineError}>{errors.participants ?? errors.split}</Text> : null}

            <Pressable accessibilityRole="button" accessibilityLabel="Add Participant" onPress={() => setPicker('contacts')} style={styles.addParticipantButton}>
              <Text style={styles.addParticipantGlyph}>＋</Text>
              <Text style={styles.addParticipantText}>Add Participant</Text>
            </Pressable>
          </Card>

          <Card style={styles.notesCard}>
            <View style={styles.notesIcon}><Text style={styles.notesGlyph}>▤</Text></View>
            <View style={styles.notesContent}>
              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                accessibilityLabel="Notes"
                maxLength={200}
                multiline
                onChangeText={value => setNotes(Array.from(value).slice(0, 200).join(''))}
                placeholder="Add a note for the group"
                placeholderTextColor={colors.textMuted}
                style={styles.notesInput}
                value={notes}
              />
              <Text style={styles.noteCounter}>{`${Array.from(notes).length}/200`}</Text>
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.footer, {paddingBottom: bottomSafeAreaInset(insets.bottom)}]}>
          {feedback ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, feedback.startsWith('Preview created') && styles.successFeedback]}>{feedback}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Create Split Expense" onPress={createMockSplit} style={styles.createButton}>
            <Text style={styles.createIcon}>▤</Text>
            <Text style={styles.createText}>Create Split Expense</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal animationType="fade" onRequestClose={() => setPicker(null)} transparent visible={Boolean(picker)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close selector" onPress={() => setPicker(null)} style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <ScrollView style={styles.modalOptions}>
              {pickerOptions.length ? pickerOptions.map(option => (
                <Pressable accessibilityRole="button" accessibilityLabel={picker === 'group-members' || picker === 'contacts' ? `Add ${option.label}` : option.label} key={option.id} onPress={() => applyPickerOption(option)} style={styles.modalOption}>
                  <Text style={styles.modalOptionLabel}>{option.label}</Text>
                  {option.detail ? <Text style={styles.modalOptionDetail}>{option.detail}</Text> : null}
                </Pressable>
              )) : <Text style={styles.emptyOptions}>Everyone available is already included.</Text>}
            </ScrollView>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel selector" onPress={() => setPicker(null)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SelectorField({
  accessibilityLabel,
  error,
  icon,
  label,
  onPress,
  required = false,
  value,
  wide = false,
}: {
  accessibilityLabel: string;
  error?: string;
  icon: string;
  label: string;
  onPress: () => void;
  required?: boolean;
  value: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Current ${label.toLowerCase()}: ${value || 'not selected'}`}
      onPress={onPress}
      style={[styles.selectorField, wide && styles.selectorWide, error && styles.invalidField]}
    >
      <Text style={styles.fieldLabel}>{label} {required ? <Text style={styles.required}>*</Text> : null}</Text>
      <View style={styles.selectorValueRow}>
        <View style={[styles.selectorIcon, label === 'Paid by' && styles.payerSelectorIcon, label === 'Category' && styles.categorySelectorIcon]}>
          <Text style={[styles.selectorGlyph, label === 'Paid by' && styles.payerSelectorGlyph, label === 'Category' && styles.categorySelectorGlyph]}>{icon}</Text>
        </View>
        <Text numberOfLines={1} style={styles.selectorValue}>{value || `Select ${label.toLowerCase()}`}</Text>
        <Text style={styles.selectorChevron}>⌄</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  flex: {flex: 1},
  header: {alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 54, paddingBottom: spacing.xs, paddingHorizontal: spacing.lg},
  backButton: {alignItems: 'flex-start', height: 40, justifyContent: 'center', width: 36},
  backGlyph: {color: colors.text, fontSize: 38, lineHeight: 42, marginTop: -5},
  headerTitle: {color: colors.text, flex: 1, fontSize: 21, fontWeight: '600'},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 38, justifyContent: 'center', width: 38},
  profileGlyph: {color: colors.white, fontSize: 22},
  scrollView: {flex: 1},
  content: {gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xs},
  detailsCard: {borderColor: '#EEECE8', borderRadius: radius.xl, gap: spacing.xs - 1, padding: spacing.md},
  sectionTitle: {color: colors.text, fontSize: 16, fontWeight: '600'},
  descriptionRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  descriptionIcon: {alignItems: 'center', backgroundColor: '#FFF0D8', borderRadius: radius.lg, height: 40, justifyContent: 'center', width: 40},
  descriptionGlyph: {color: '#98530D', fontSize: 22},
  descriptionField: {backgroundColor: '#FBFAF8', borderColor: '#E8E5E0', borderRadius: radius.lg, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  descriptionInputRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs},
  fieldLabel: {color: colors.textMuted, fontSize: typography.sm},
  required: {color: colors.destructive, fontWeight: '700'},
  descriptionInput: {color: colors.text, flex: 1, fontSize: typography.md, padding: 0},
  clearGlyph: {color: colors.textMuted, fontSize: 24, lineHeight: 26},
  fieldRow: {flexDirection: 'row', gap: spacing.sm},
  fieldCard: {backgroundColor: '#FBFAF8', borderColor: '#E8E5E0', borderRadius: radius.lg, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  amountInputRow: {alignItems: 'center', flexDirection: 'row', marginTop: spacing.xs},
  rupeeSymbol: {color: colors.text, fontSize: typography.md, fontWeight: '600', marginRight: spacing.xs},
  amountInput: {color: colors.text, flex: 1, fontSize: typography.md, fontWeight: '600', minWidth: 0, padding: 0},
  selectorField: {backgroundColor: '#FBFAF8', borderColor: '#E8E5E0', borderRadius: radius.lg, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  selectorWide: {flex: 0, width: '100%'},
  selectorValueRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, minWidth: 0},
  selectorIcon: {alignItems: 'center', backgroundColor: '#FFF0D8', borderRadius: radius.md, height: 26, justifyContent: 'center', width: 26},
  selectorGlyph: {fontSize: 17},
  payerSelectorIcon: {backgroundColor: colors.successMuted},
  payerSelectorGlyph: {color: colors.success, fontSize: typography.lg},
  categorySelectorIcon: {backgroundColor: colors.primaryMuted, borderRadius: radius.full},
  categorySelectorGlyph: {color: colors.primary},
  selectorValue: {color: colors.text, flex: 1, fontSize: typography.md, minWidth: 0},
  selectorChevron: {color: colors.textMuted, fontSize: 20, lineHeight: 22},
  invalidField: {borderColor: colors.destructive},
  inlineError: {color: colors.destructive, fontSize: typography.xs, marginTop: -spacing.xs},
  splitTypeCard: {borderColor: '#EEECE8', borderRadius: radius.xl, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  modeList: {backgroundColor: '#F7F6F3', borderColor: '#E8E5E0', borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', padding: 2},
  modeButton: {alignItems: 'center', borderRadius: radius.full, flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 34, paddingHorizontal: spacing.xs},
  modeButtonSelected: {backgroundColor: colors.primary, elevation: 1},
  modeIcon: {color: colors.textMuted, fontSize: typography.md},
  modeText: {color: '#484451', fontSize: typography.sm, fontWeight: '500'},
  modeTextSelected: {color: colors.white, fontWeight: '600'},
  participantsCard: {borderColor: '#EEECE8', borderRadius: radius.xl, gap: spacing.xs, padding: spacing.sm},
  participantsHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0},
  addFromGroup: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, minHeight: 28, paddingHorizontal: spacing.md},
  addFromGroupIcon: {color: colors.primary, fontSize: typography.lg},
  addFromGroupText: {color: colors.primary, fontSize: typography.sm, fontWeight: '500'},
  participantRow: {alignItems: 'center', backgroundColor: colors.surface, borderColor: '#ECEAE6', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 34, paddingHorizontal: spacing.xs},
  dragHandle: {color: '#8D8993', fontSize: 17},
  avatar: {alignItems: 'center', borderRadius: radius.full, height: 28, justifyContent: 'center', width: 28},
  avatarGreen: {backgroundColor: '#9CF2D5'},
  avatarViolet: {backgroundColor: colors.primaryMuted},
  avatarAmber: {backgroundColor: '#FFE0BE'},
  avatarNeutral: {backgroundColor: '#E9E7E3'},
  avatarInitials: {color: colors.text, fontSize: typography.md, fontWeight: '500'},
  participantInfo: {flex: 1, minWidth: 0},
  participantName: {color: colors.text, fontSize: typography.sm, fontWeight: '500'},
  participantShare: {color: colors.text, fontSize: typography.sm, marginTop: 1},
  customShareLine: {alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', marginLeft: spacing.xs, minWidth: 68},
  customSharePrefix: {color: colors.text, fontSize: typography.sm},
  customShareInput: {color: colors.text, fontSize: typography.sm, minWidth: 42, padding: 0, textAlign: 'right'},
  percentSuffix: {color: colors.textMuted, fontSize: typography.sm, marginLeft: 2},
  shareSubtext: {color: colors.textMuted, fontSize: typography.xs},
  removeButton: {alignItems: 'center', height: 32, justifyContent: 'center', width: 28},
  removeGlyph: {color: colors.textMuted, fontSize: 22, lineHeight: 24},
  splitStatus: {alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, minHeight: 32, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs},
  splitStatusValid: {backgroundColor: colors.successMuted},
  splitStatusAttention: {backgroundColor: '#FFF0DC'},
  splitStatusGlyph: {alignItems: 'center', borderRadius: radius.full, color: colors.white, fontSize: typography.xs, fontWeight: '700', height: 18, lineHeight: 18, textAlign: 'center', width: 18},
  splitStatusGlyphValid: {backgroundColor: colors.success},
  splitStatusGlyphAttention: {backgroundColor: colors.warning},
  splitStatusText: {color: colors.text, flex: 1, fontSize: typography.xs},
  addParticipantButton: {alignItems: 'center', backgroundColor: '#F1E7FF', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xs, minHeight: 36},
  addParticipantGlyph: {color: colors.primary, fontSize: 23, lineHeight: 25},
  addParticipantText: {color: colors.primary, fontSize: typography.sm, fontWeight: '600'},
  notesCard: {alignItems: 'flex-start', borderColor: '#EEECE8', borderRadius: radius.xl, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm},
  notesIcon: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.md, height: 32, justifyContent: 'center', width: 32},
  notesGlyph: {color: colors.textMuted, fontSize: 25},
  notesContent: {flex: 1, minWidth: 0},
  notesInput: {backgroundColor: '#FBFAF8', borderColor: '#E8E5E0', borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: typography.sm, marginTop: spacing.xs, minHeight: 34, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, textAlignVertical: 'center'},
  noteCounter: {color: colors.textMuted, fontSize: typography.xs, marginTop: spacing.xs - 2, textAlign: 'right'},
  footer: {backgroundColor: colors.background, gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  feedback: {color: colors.destructive, fontSize: typography.xs, textAlign: 'center'},
  successFeedback: {color: colors.success},
  createButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 4, flexDirection: 'row', gap: spacing.md, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.lg, shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8},
  createIcon: {color: colors.white, fontSize: 22},
  createText: {color: colors.white, fontSize: typography.lg, fontWeight: '600'},
  modalRoot: {alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl},
  modalBackdrop: {backgroundColor: 'rgba(25, 23, 29, 0.42)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  modalCard: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, elevation: 8, maxHeight: '75%', padding: spacing.lg, width: '100%'},
  modalTitle: {color: colors.text, fontSize: typography.lg, fontWeight: '600', marginBottom: spacing.sm},
  modalOptions: {flexGrow: 0},
  modalOption: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingVertical: spacing.sm},
  modalOptionLabel: {color: colors.text, fontSize: typography.md},
  modalOptionDetail: {color: colors.textMuted, fontSize: typography.sm},
  emptyOptions: {color: colors.textMuted, fontSize: typography.sm, paddingVertical: spacing.lg},
  cancelButton: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, justifyContent: 'center', marginTop: spacing.md, minHeight: 44},
  cancelText: {color: colors.text, fontSize: typography.md, fontWeight: '500'},
});
