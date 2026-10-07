import React, {useState} from 'react';
import {Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {kharchivaIcon} from '../../assets';
import {bottomSafeAreaInset, FIXED_ACTION_SCROLL_GAP} from '../../components/layoutInsets';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing, typography} from '../../theme';
import {splitCategories, splitExpenseMock, splitModes, splitParticipants, type SplitMode, type SplitParticipant} from './splitExpenseData';
import {allocateWeightedCents, calculateSplit, formatINR, parseRupeesToPaise} from './splitCalculator';

function participantPercent(share: number, total: number) {
  return total > 0 ? Math.round((share / total) * 100) : 0;
}

export function SplitExpenseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [amount, setAmount] = useState<string>(splitExpenseMock.amount);
  const [title, setTitle] = useState<string>(splitExpenseMock.title);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(splitParticipants.map(person => [person.id, true])),
  );
  const [payerId, setPayerId] = useState<string>(splitExpenseMock.payerId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string>(splitExpenseMock.note);
  const [editingNote, setEditingNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const totalCents = parseRupeesToPaise(amount);
  const selectedParticipants = splitParticipants.filter(person => selected[person.id]);
  const participantIds = selectedParticipants.map(person => person.id);
  const equalShares = allocateWeightedCents(totalCents, participantIds.map(() => 1));
  const defaults: Record<string, string> = Object.fromEntries(selectedParticipants.map((person, index) => {
    if (mode === 'exact') {
      return [person.id, ((equalShares[index] ?? 0) / 100).toFixed(2)];
    }
    if (mode === 'percent') {
      const percentage = index === selectedParticipants.length - 1
        ? 100 - (Math.floor((100 / Math.max(selectedParticipants.length, 1)) * 100) / 100) * (selectedParticipants.length - 1)
        : Math.floor((100 / Math.max(selectedParticipants.length, 1)) * 100) / 100;
      return [person.id, String(percentage)];
    }
    return [person.id, '1'];
  }));
  const effectiveValues = Object.fromEntries(participantIds.map(id => [id, values[id] ?? defaults[id] ?? '0']));
  const calculation = calculateSplit(totalCents, participantIds, mode, effectiveValues);

  const changeMode = (nextMode: SplitMode) => {
    const nextEqualShares = allocateWeightedCents(totalCents, participantIds.map(() => 1));
    const nextValues: Record<string, string> = {};
    selectedParticipants.forEach((person, index) => {
      if (nextMode === 'exact') {
        nextValues[person.id] = ((nextEqualShares[index] ?? 0) / 100).toFixed(2);
      } else if (nextMode === 'percent') {
        const base = Math.floor((100 / Math.max(selectedParticipants.length, 1)) * 100) / 100;
        nextValues[person.id] = String(index === selectedParticipants.length - 1 ? 100 - base * (selectedParticipants.length - 1) : base);
      } else {
        nextValues[person.id] = '1';
      }
    });
    setValues(nextValues);
    setMode(nextMode);
    setConfirmed(false);
  };

  const toggleParticipant = (person: SplitParticipant) => {
    if (selected[person.id] && selectedParticipants.length === 1) {
      return;
    }
    if (selected[person.id] && payerId === person.id) {
      const replacement = selectedParticipants.find(candidate => candidate.id !== person.id);
      if (replacement) {
        setPayerId(replacement.id);
      }
    }
    setSelected(current => ({...current, [person.id]: !current[person.id]}));
    setConfirmed(false);
  };

  const changePayer = () => {
    const payers = selectedParticipants;
    if (payers.length < 2) {
      return;
    }
    const currentIndex = payers.findIndex(person => person.id === payerId);
    setPayerId(payers[(currentIndex + 1) % payers.length].id);
  };

  const selectAll = () => {
    const allSelected = selectedParticipants.length === splitParticipants.length;
    setSelected(Object.fromEntries(splitParticipants.map(person => [person.id, !allSelected])));
    if (!allSelected && !selected[payerId]) {
      setPayerId(splitExpenseMock.payerId);
    }
    setConfirmed(false);
  };

  const summaryTitle = mode === 'equal' && calculation.shares[participantIds[0]] !== undefined
    && Object.values(calculation.shares).every(value => value === calculation.shares[participantIds[0]])
    ? `${calculation.selectedCount} participants · ${formatINR(calculation.shares[participantIds[0]])} each = ${formatINR(calculation.allocatedCents)} total`
    : `${calculation.selectedCount} participants · shares total ${formatINR(calculation.allocatedCents)}`;
  const remainingLabel = calculation.remainingCents === 0
    ? '₹0 remaining · Exact match'
    : calculation.remainingCents > 0
      ? `${formatINR(calculation.remainingCents)} remaining · Adjust shares to match`
      : `${formatINR(Math.abs(calculation.remainingCents))} over · Adjust shares to match`;
  const payer = splitParticipants.find(person => person.id === payerId) ?? splitParticipants[0];

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.sm)}]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backGlyph}>‹</Text></Pressable>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandMark} />
          <Text numberOfLines={1} style={styles.headerTitle}>Kharchiva — Split Expense Calculator</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}><Text style={styles.profileGlyph}>♙</Text></Pressable>
        </View>

        <View style={styles.screenHeading}>
          <Text style={styles.screenTitle}>Split Expense</Text>
          <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>{splitExpenseMock.groupName}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Split saved' : 'Save Split'} onPress={() => setSaved(value => !value)} style={styles.saveButton}><Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save Split'}</Text></Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, {paddingBottom: FIXED_ACTION_SCROLL_GAP}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.expenseCard}>
            <View style={styles.billTop}>
              <View style={styles.billDescription}>
                <Pressable accessibilityRole="button" accessibilityLabel="Change category" onPress={() => setCategoryIndex(index => (index + 1) % splitCategories.length)} style={styles.categoryLine}><Text style={styles.categoryGlyph}>⚒</Text><Text style={styles.categoryText}>{splitCategories[categoryIndex]}</Text></Pressable>
                <TextInput accessibilityLabel="Expense title" value={title} onChangeText={value => {setTitle(value); setConfirmed(false);}} style={styles.titleInput} placeholder="Expense name" placeholderTextColor={colors.textMuted} returnKeyType="done" />
              </View>
              <View style={styles.billAmount}>
                <Text style={styles.totalBillLabel}>TOTAL BILL</Text>
                <View style={styles.amountInputRow}><Text style={styles.rupeeSymbol}>₹</Text><TextInput accessibilityLabel="Expense amount" keyboardType="decimal-pad" value={amount} onChangeText={value => {setAmount(value.replace(/[^\d.]/g, '')); setConfirmed(false);}} style={styles.amountInput} selectTextOnFocus /></View>
              </View>
            </View>
            <View style={styles.payerBar}>
              <View style={[styles.payerAvatar, avatarStyles[payer.tone]]}><Text style={styles.payerInitials}>{payer.initials}</Text></View>
              <View style={styles.payerCopy}><Text style={styles.paidByLabel}>Paid by</Text><Text numberOfLines={1} style={styles.payerName}>{payer.name}{payer.isCurrentUser ? ' (You)' : ''}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change payer" onPress={changePayer} style={styles.changePayer}><Text style={styles.changePayerText}>Change</Text><Text style={styles.changePayerGlyph}>↔</Text></Pressable>
            </View>
          </Card>

          <View style={styles.modeList}>
            {splitModes.map(splitMode => {
              const active = mode === splitMode.id;
              return <Pressable key={splitMode.id} accessibilityRole="button" accessibilityLabel={splitMode.label} accessibilityState={{selected: active}} onPress={() => changeMode(splitMode.id)} style={[styles.modeButton, active && styles.modeButtonSelected]}><Text numberOfLines={1} style={[styles.modeText, active && styles.modeTextSelected]}>{splitMode.label}</Text></Pressable>;
            })}
          </View>

          <View style={[styles.summaryStrip, calculation.exactMatch ? styles.summaryMatched : styles.summaryAttention]}>
            <View style={[styles.summaryCheck, !calculation.exactMatch && styles.summaryCheckAttention]}><Text style={styles.summaryCheckText}>{calculation.exactMatch ? '✓' : '!'}</Text></View>
            <View style={styles.summaryCopy}><Text style={styles.summaryPrimary}>{summaryTitle}</Text><Text style={styles.summarySecondary}>{remainingLabel}</Text></View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>SPLITTING WITH ({selectedParticipants.length})</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={selectedParticipants.length === splitParticipants.length ? 'Deselect all participants' : 'Select all participants'} onPress={selectAll}><Text style={styles.selectAllText}>{selectedParticipants.length === splitParticipants.length ? 'Deselect All' : 'Select All'}</Text></Pressable>
          </View>

          <Card style={styles.participantList}>
            {splitParticipants.map((person, index) => {
              const isSelected = Boolean(selected[person.id]);
              const shareCents = calculation.shares[person.id] ?? 0;
              const percent = participantPercent(shareCents, totalCents);
              const suffix = mode === 'percent' ? '%' : mode === 'shares' ? ' shares' : '';
              const inputLabel = mode === 'exact' ? `${person.name} exact share` : mode === 'percent' ? `${person.name} percentage share` : `${person.name} share units`;
              return (
                <View key={person.id} style={[styles.participantRow, index === splitParticipants.length - 1 && styles.participantLast]}>
                  <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${person.name}`} accessibilityState={{checked: isSelected}} onPress={() => toggleParticipant(person)} style={[styles.checkbox, isSelected && styles.checkboxSelected]}>{isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}</Pressable>
                  <View style={[styles.participantAvatar, avatarStyles[person.tone]]}><Text style={styles.participantInitials}>{person.initials}</Text></View>
                  <View style={styles.participantCopy}>
                    <View style={styles.participantNameLine}><Text numberOfLines={1} style={styles.participantName}>{person.name}</Text>{person.isCurrentUser ? <View style={styles.youBadge}><Text style={styles.youText}>You</Text></View> : null}</View>
                    <Text style={styles.participantRole}>{person.id === payerId ? 'Payer · ' : ''}{percent}% share</Text>
                  </View>
                  <View style={styles.shareBlock}>
                    {!isSelected ? <Text style={styles.excludedText}>Not included</Text> : mode === 'equal' ? <Text style={styles.shareAmount}>{formatINR(shareCents)}</Text> : (
                      <View style={styles.shareInputLine}><TextInput accessibilityLabel={inputLabel} editable={isSelected} keyboardType="decimal-pad" value={effectiveValues[person.id] ?? ''} onChangeText={value => setValues(current => ({...current, [person.id]: value.replace(/[^\d.]/g, '')}))} style={styles.shareInput}/><Text style={styles.shareSuffix}>{suffix}</Text></View>
                    )}
                    <Text style={[styles.shareHint, !isSelected && styles.excludedText]}>{!isSelected ? 'Excluded' : mode === 'equal' ? 'Equally split' : `${formatINR(shareCents)} share`}</Text>
                  </View>
                </View>
              );
            })}
          </Card>

          <Card style={styles.noteCard}>
            <View style={styles.noteField}>
              <Text style={styles.noteIcon}>▤</Text>
              {editingNote ? <TextInput accessibilityLabel="Split note" value={note} onChangeText={setNote} style={styles.noteInput} multiline returnKeyType="done" /> : <Text numberOfLines={2} style={styles.noteText}>Note: <Text style={styles.noteDetail}>{note}</Text></Text>}
              <Pressable accessibilityRole="button" accessibilityLabel={editingNote ? 'Done editing note' : 'Edit note'} onPress={() => setEditingNote(value => !value)}><Text style={styles.noteEdit}>{editingNote ? 'Done' : 'Edit'}</Text></Pressable>
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.footer, {paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.sm}]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Confirm Split" accessibilityState={{disabled: !calculation.exactMatch || selectedParticipants.length === 0}} disabled={!calculation.exactMatch || selectedParticipants.length === 0} onPress={() => setConfirmed(true)} style={[styles.confirmButton, (!calculation.exactMatch || selectedParticipants.length === 0) && styles.confirmDisabled]}><Text numberOfLines={1} style={styles.confirmText}>{confirmed ? 'Split Confirmed ✓' : `Confirm Split  •  ${formatINR(totalCents)}  →`}</Text></Pressable>
          <View style={styles.footerInfo}><Text style={styles.footerIcon}>▣</Text><Text style={styles.footerNote}>{confirmed ? 'Split preview saved locally.' : `Balances will update across ${splitExpenseMock.groupName} group members instantly.`}</Text></View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  flex: {flex: 1},
  header: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingBottom: spacing.xs, paddingHorizontal: spacing.md},
  backButton: {alignItems: 'center', height: 38, justifyContent: 'center', width: 28},
  backGlyph: {color: colors.text, fontSize: 35, lineHeight: 40, marginTop: -4},
  brandMark: {height: 30, width: 30},
  headerTitle: {color: '#111111', flex: 1, fontSize: typography.lg, fontWeight: '500'},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 36, justifyContent: 'center', width: 36},
  profileGlyph: {color: colors.white, fontSize: 19},
  screenHeading: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md},
  screenTitle: {color: '#111111', flexShrink: 1, fontSize: typography.xl, fontWeight: '600'},
  groupBadge: {backgroundColor: '#61EFC0', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  groupBadgeText: {color: colors.success, fontSize: typography.sm},
  saveButton: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, justifyContent: 'center', marginLeft: 'auto', minHeight: 40, paddingHorizontal: spacing.md},
  saveText: {color: colors.primary, fontSize: typography.sm, fontWeight: '600'},
  scrollView: {flex: 1},
  content: {gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg},
  expenseCard: {borderColor: '#F0EFEB', borderRadius: radius.xl, gap: spacing.lg, padding: spacing.lg},
  billTop: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  billDescription: {flex: 1, gap: spacing.xs, minWidth: 0},
  categoryLine: {alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing.sm},
  categoryGlyph: {color: colors.primary, fontSize: typography.lg},
  categoryText: {color: '#393641', fontSize: typography.md},
  titleInput: {color: '#111111', fontSize: typography.lg, fontWeight: '500', maxWidth: '100%', minHeight: 32, padding: 0},
  billAmount: {alignItems: 'flex-end', minWidth: 106},
  totalBillLabel: {color: '#393641', fontSize: typography.xs, letterSpacing: 0.6},
  amountInputRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', maxWidth: 152},
  rupeeSymbol: {color: '#111111', fontSize: 31, fontWeight: '600'},
  amountInput: {color: '#111111', fontSize: 31, fontWeight: '700', minWidth: 76, padding: 0, textAlign: 'right'},
  payerBar: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, minHeight: 66, paddingHorizontal: spacing.md},
  payerAvatar: {alignItems: 'center', borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40},
  avatarViolet: {backgroundColor: colors.primary},
  avatarGreen: {backgroundColor: '#61EFC0'},
  avatarAmber: {backgroundColor: '#FFE0BE'},
  avatarBlue: {backgroundColor: '#D9E6FF'},
  payerInitials: {color: colors.white, fontSize: typography.sm, fontWeight: '600'},
  payerCopy: {flex: 1, minWidth: 0},
  paidByLabel: {color: colors.textMuted, fontSize: typography.xs},
  payerName: {color: '#111111', fontSize: typography.md, fontWeight: '500'},
  changePayer: {alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md},
  changePayerText: {color: colors.primary, fontSize: typography.sm},
  changePayerGlyph: {color: colors.primary, fontSize: typography.md},
  modeList: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, flexDirection: 'row', minHeight: 48, padding: spacing.xs},
  modeButton: {alignItems: 'center', borderRadius: radius.full, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.xs},
  modeButtonSelected: {backgroundColor: '#7839E8'},
  modeText: {color: '#393641', fontSize: typography.sm, fontWeight: '500'},
  modeTextSelected: {color: colors.white, fontWeight: '600'},
  summaryStrip: {alignItems: 'center', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, minHeight: 62, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  summaryMatched: {backgroundColor: '#CFF8E8'},
  summaryAttention: {backgroundColor: '#F8EBDD'},
  summaryCheck: {alignItems: 'center', backgroundColor: colors.success, borderRadius: radius.full, height: 24, justifyContent: 'center', width: 24},
  summaryCheckAttention: {backgroundColor: colors.warning},
  summaryCheckText: {color: colors.white, fontSize: typography.sm, fontWeight: '700'},
  summaryCopy: {flex: 1, gap: 2},
  summaryPrimary: {color: '#075C43', fontSize: typography.md, fontWeight: '600'},
  summarySecondary: {color: '#075C43', fontSize: typography.sm},
  sectionHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm},
  sectionLabel: {color: '#393641', fontSize: typography.sm, letterSpacing: 0.5},
  selectAllText: {color: colors.primary, fontSize: typography.sm},
  participantList: {borderColor: '#F0EFEB', borderRadius: radius.xl, overflow: 'hidden', padding: 0},
  participantRow: {alignItems: 'center', borderBottomColor: '#EEECE8', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, minHeight: 76, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  participantLast: {borderBottomWidth: 0},
  checkbox: {alignItems: 'center', borderColor: '#CFCAD5', borderRadius: 5, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22},
  checkboxSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkboxTick: {color: colors.white, fontSize: 15, fontWeight: '700', lineHeight: 18},
  participantAvatar: {alignItems: 'center', borderRadius: radius.full, height: 46, justifyContent: 'center', width: 46},
  participantInitials: {color: '#302B3A', fontSize: typography.sm, fontWeight: '600'},
  participantCopy: {flex: 1, gap: 2, minWidth: 0},
  participantNameLine: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, minWidth: 0},
  participantName: {color: '#111111', flexShrink: 1, fontSize: typography.md, fontWeight: '500'},
  youBadge: {backgroundColor: '#F0EFEB', borderRadius: 5, paddingHorizontal: spacing.xs, paddingVertical: 2},
  youText: {color: '#393641', fontSize: typography.xs},
  participantRole: {color: colors.textMuted, fontSize: typography.sm},
  shareBlock: {alignItems: 'flex-end', minWidth: 82},
  shareAmount: {color: '#111111', fontSize: typography.lg, fontWeight: '600'},
  shareHint: {color: colors.success, fontSize: typography.xs, marginTop: 2},
  shareInputLine: {alignItems: 'center', flexDirection: 'row'},
  shareInput: {borderBottomColor: colors.primary, borderBottomWidth: 1, color: '#111111', fontSize: typography.md, fontWeight: '600', minWidth: 44, padding: 0, textAlign: 'right'},
  shareSuffix: {color: colors.textMuted, fontSize: typography.xs, marginLeft: 3},
  excludedText: {color: colors.textMuted, fontSize: typography.xs},
  noteCard: {borderColor: '#F0EFEB', borderRadius: radius.xl, marginTop: spacing.md, padding: spacing.md},
  noteField: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  noteIcon: {color: '#393641', fontSize: typography.lg},
  noteText: {color: '#393641', flex: 1, fontSize: typography.md},
  noteDetail: {color: '#111111'},
  noteInput: {color: colors.text, flex: 1, fontSize: typography.md, maxHeight: 84, minHeight: 28, padding: 0},
  noteEdit: {color: colors.primary, fontSize: typography.sm, fontWeight: '500'},
  footer: {backgroundColor: colors.background, gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  confirmButton: {alignItems: 'center', backgroundColor: '#7839E8', borderRadius: radius.full, elevation: 4, justifyContent: 'center', minHeight: 58, paddingHorizontal: spacing.lg, shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8},
  confirmDisabled: {backgroundColor: '#B7A1D9', elevation: 0},
  confirmText: {color: colors.white, fontSize: typography.lg, fontWeight: '600'},
  footerInfo: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingHorizontal: spacing.md},
  footerIcon: {color: colors.success, fontSize: typography.md},
  footerNote: {color: '#393641', flex: 1, fontSize: typography.xs, lineHeight: 17, textAlign: 'center'},
});

const avatarStyles = {
  violet: styles.avatarViolet,
  green: styles.avatarGreen,
  amber: styles.avatarAmber,
  blue: styles.avatarBlue,
};
