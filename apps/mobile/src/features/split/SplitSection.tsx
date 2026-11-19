import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Text } from '../../components/Text';
import { Users } from '../../components/icons';
import { useLanguage } from '../../i18n/i18n';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { NewItemSheet } from '../catalog/NewItemSheet';
import { ME, computeShares, myShare, withMethod, type SplitDraft, type SplitMethod } from './splitMath';
import { addSplitPerson, useSplits } from './splitStore';

type Props = {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  /** The bill total in paise; null until a valid amount is typed. */
  totalPaise: number | null;
  draft: SplitDraft;
  onChange: (next: SplitDraft) => void;
};

const METHODS: { id: SplitMethod; label: string }[] = [
  { id: 'EQUAL', label: 'Barabar' },
  { id: 'CUSTOM', label: 'Custom' },
  { id: 'PERCENT', label: 'Percent' },
];

/** "Dosto ke saath split karo": who shared the bill, who paid, and how it is divided. */
export function SplitSection({ enabled, onToggle, totalPaise, draft, onChange }: Props) {
  const { t } = useLanguage();
  const { people } = useSplits();
  const [adding, setAdding] = useState(false);
  const nameOf = (personId: string) => (personId === ME ? t('Aap') : people.find(person => person.id === personId)?.name ?? '');
  const result = computeShares(draft, totalPaise);
  const shareOf = (personId: string) => result.shares?.find(share => share.personId === personId)?.paise;
  const participants = [ME, ...draft.people];

  const togglePerson = (personId: string) => {
    const selected = draft.people.includes(personId);
    const nextPeople = selected ? draft.people.filter(id => id !== personId) : [...draft.people, personId];
    onChange({ ...draft, people: nextPeople, paidBy: nextPeople.includes(draft.paidBy) || draft.paidBy === ME ? draft.paidBy : ME });
  };

  const setField = (field: 'custom' | 'percent', personId: string, value: string) => {
    onChange({ ...draft, [field]: { ...draft[field], [personId]: value.replace(/[^\d.]/g, '') } });
  };

  const summary = (() => {
    if (!result.shares) {
      // Missing total is only a hint; a real mismatch is shown as a warning.
      return { text: t(result.problem), tone: result.problem === 'Pehle total amount daalo.' ? 'hint' : 'warning' } as const;
    }
    const mine = myShare(result.shares);
    if (draft.paidBy === ME) {
      return { text: t('Aapka hissa {mine}. Baaki {others} dost denge.', { mine: formatRupees(mine), others: formatRupees((totalPaise ?? 0) - mine) }), tone: 'ok' } as const;
    }
    return { text: t('Aapko {name} ko {amount} dena hai.', { name: nameOf(draft.paidBy), amount: formatRupees(mine) }), tone: 'ok' } as const;
  })();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Users color={colors.primary} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label" style={styles.title}>Dosto ke saath split karo</Text>
          <Text variant="caption">Total bill daalo. Home me sirf aapka hissa judega.</Text>
        </View>
        <Switch
          accessibilityLabel="Split with friends"
          onValueChange={onToggle}
          thumbColor={colors.white}
          trackColor={{ false: '#D8D4DD', true: colors.primary }}
          value={enabled}
        />
      </View>

      {enabled ? (
        <View style={styles.body}>
          <Text variant="label" style={styles.label}>KISKE SAATH?</Text>
          <View style={styles.chips}>
            {people.map(person => {
              const selected = draft.people.includes(person.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Friend ${person.name}`}
                  accessibilityState={{ selected }}
                  key={person.id}
                  onPress={() => togglePerson(person.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text variant="label" style={selected ? styles.chipTextSelected : styles.chipText}>{person.name}</Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" accessibilityLabel="Add a new friend" onPress={() => setAdding(true)} style={[styles.chip, styles.addChip]}>
              <Text variant="label" style={styles.addText}>+ Naya dost</Text>
            </Pressable>
          </View>

          {draft.people.length > 0 ? (
            <>
              <Text variant="label" style={styles.label}>KISNE PAY KIYA?</Text>
              <View style={styles.chips}>
                {participants.map(personId => {
                  const selected = draft.paidBy === personId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Paid by ${personId === ME ? 'me' : nameOf(personId)}`}
                      accessibilityState={{ selected }}
                      key={personId}
                      onPress={() => onChange({ ...draft, paidBy: personId })}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text variant="label" style={selected ? styles.chipTextSelected : styles.chipText}>{personId === ME ? t('Main') : nameOf(personId)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text variant="label" style={styles.label}>KAISE BANTEIN?</Text>
              <View style={styles.segment}>
                {METHODS.map(method => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Split ${method.id.toLowerCase()}`}
                    accessibilityState={{ selected: draft.method === method.id }}
                    key={method.id}
                    onPress={() => onChange(withMethod(draft, method.id, totalPaise))}
                    style={[styles.segmentOption, draft.method === method.id && styles.segmentSelected]}
                  >
                    <Text variant="label" style={draft.method === method.id ? styles.segmentTextSelected : styles.segmentText}>{method.label}</Text>
                  </Pressable>
                ))}
              </View>

              {participants.map(personId => {
                const share = shareOf(personId);
                return (
                  <View key={personId} style={styles.row}>
                    <Text variant="label" numberOfLines={1} style={styles.rowName}>{nameOf(personId)}</Text>
                    {draft.method === 'CUSTOM' ? (
                      <View style={styles.inputWrap}>
                        <Text style={styles.unit}>₹</Text>
                        <TextInput
                          accessibilityLabel={`Share of ${personId === ME ? 'me' : nameOf(personId)}`}
                          keyboardType="decimal-pad"
                          onChangeText={value => setField('custom', personId, value)}
                          placeholder="0"
                          placeholderTextColor={colors.border}
                          style={styles.input}
                          value={draft.custom[personId] ?? ''}
                        />
                      </View>
                    ) : draft.method === 'PERCENT' ? (
                      <View style={styles.percentWrap}>
                        <View style={styles.inputWrap}>
                          <TextInput
                            accessibilityLabel={`Percent of ${personId === ME ? 'me' : nameOf(personId)}`}
                            keyboardType="decimal-pad"
                            onChangeText={value => setField('percent', personId, value)}
                            placeholder="0"
                            placeholderTextColor={colors.border}
                            style={styles.input}
                            value={draft.percent[personId] ?? ''}
                          />
                          <Text style={styles.unit}>%</Text>
                        </View>
                        {share !== undefined ? <Text variant="caption" style={styles.shareCaption}>{formatRupees(share)}</Text> : null}
                      </View>
                    ) : (
                      <Text variant="label" style={styles.shareValue}>{share !== undefined ? formatRupees(share) : '—'}</Text>
                    )}
                  </View>
                );
              })}

              <Text accessibilityLiveRegion="polite" variant="caption" style={summary.tone === 'warning' ? styles.warning : summary.tone === 'hint' ? styles.hint : styles.summary}>{summary.text}</Text>
            </>
          ) : (
            <Text variant="caption" style={styles.warning}>Pehle dost chuno.</Text>
          )}
        </View>
      ) : null}

      <NewItemSheet
        onClose={() => setAdding(false)}
        onSave={async name => {
          const created = await addSplitPerson(name);
          onChange({ ...draft, people: [...draft.people, created.id] });
        }}
        placeholder="Jaise: Rahul"
        title="Naya dost"
        visible={adding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  icon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15 },
  body: { gap: spacing.md, marginTop: spacing.lg },
  label: { color: colors.textMuted, letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.white },
  addChip: { backgroundColor: colors.selected, borderColor: colors.primaryMuted },
  addText: { color: colors.primary },
  segment: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 4 },
  segmentOption: { alignItems: 'center', borderRadius: radius.full, flex: 1, paddingVertical: spacing.sm },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted },
  segmentTextSelected: { color: colors.primary },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  rowName: { color: colors.text, flex: 1 },
  shareValue: { color: colors.text },
  inputWrap: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: 4, minWidth: 96, paddingHorizontal: spacing.md },
  input: { color: colors.text, fontSize: 16, fontWeight: '600', minHeight: 40, minWidth: 56, padding: 0, textAlign: 'right' },
  unit: { color: colors.textMuted, fontSize: 15 },
  percentWrap: { alignItems: 'flex-end', gap: 2 },
  shareCaption: { color: colors.textMuted },
  summary: { color: colors.primary, fontWeight: '600' },
  warning: { color: colors.destructive },
  hint: { color: colors.textMuted },
});
