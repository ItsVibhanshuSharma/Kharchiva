import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import { celebrate } from '../../components/celebration';
import { Check, Mic, Square, X } from '../../components/icons';
import { getTransactionRepository } from '../../database/transactionRepository';
import { dateForExpenseInput, describeDateInput, expenseDateToIso } from '../../screens/expenses/expenseInputUtils';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { notifyEntriesChanged } from '../entries/entryEvents';
import { parseSpokenEntries, type ParsedEntry } from './parseSpokenEntries';
import { startSpeech } from './speech';

export type VoiceEntrySheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after entries are saved so the caller can refresh its totals. */
  onSaved: (count: number) => void;
};

type ListenState = 'idle' | 'listening' | 'error';

const EXAMPLES = ['500 petrol aur 250 lunch', 'kal salary aayi 1 lakh', '850 swiggy dinner 3 din pehle'];

function titleOf(entry: ParsedEntry) {
  return entry.merchant ?? entry.note ?? entry.category;
}

export function VoiceEntrySheet({ visible, onClose, onSaved }: VoiceEntrySheetProps) {
  const insets = useSafeAreaInsets();
  const [transcript, setTranscript] = useState('');
  const [listenState, setListenState] = useState<ListenState>('idle');
  const [message, setMessage] = useState('');
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const today = dateForExpenseInput(new Date());

  const parsed = useMemo(() => parseSpokenEntries(transcript, today), [transcript, today]);
  // Manual tweaks are tied to the current text; editing the text resets them.
  const entries = parsed.entries
    .map((entry, index) => ({ entry: flipped.has(index) ? flip(entry) : entry, index }))
    .filter(item => !removed.has(item.index));

  const updateTranscript = useCallback((text: string) => {
    setTranscript(text);
    setRemoved(new Set());
    setFlipped(new Set());
  }, []);

  const stopListening = useCallback(async () => {
    const stop = stopRef.current;
    stopRef.current = null;
    setListenState(current => (current === 'listening' ? 'idle' : current));
    if (stop) await stop();
  }, []);

  const listen = useCallback(async () => {
    await stopListening();
    setMessage('');
    setListenState('listening');
    updateTranscript('');
    try {
      stopRef.current = await startSpeech({
        onPartial: text => text && updateTranscript(text),
        onFinal: text => {
          if (text) updateTranscript(text);
          setListenState('idle');
        },
        onEnd: () => setListenState(current => (current === 'listening' ? 'idle' : current)),
        onError: text => {
          setListenState('error');
          setMessage(text);
        },
      });
    } catch (error) {
      setListenState('error');
      setMessage(error instanceof Error ? error.message : 'Voice input shuru nahi ho paya.');
    }
  }, [stopListening, updateTranscript]);

  // Opening the sheet starts listening straight away: one tap from Home to speaking.
  useEffect(() => {
    if (visible) {
      listen();
    } else {
      stopListening();
      updateTranscript('');
      setMessage('');
      setListenState('idle');
      setSaving(false);
    }
  }, [visible, listen, stopListening, updateTranscript]);

  useEffect(() => {
    if (listenState !== 'listening') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [listenState, pulse]);

  const close = () => {
    stopListening();
    onClose();
  };

  const save = async () => {
    if (!entries.length || saving) return;
    await stopListening();
    setSaving(true);
    setMessage('');
    const saved: number[] = [];
    try {
      const repository = await getTransactionRepository();
      for (const { entry, index } of entries) {
        const occurredAt = expenseDateToIso(entry.date, new Date()) ?? undefined;
        if (entry.type === 'income') {
          await repository.createIncome({ amountPaise: entry.amountPaise, category: entry.category, occurredAt, note: entry.note, sourceName: entry.merchant });
        } else {
          await repository.createExpense({
            amountPaise: entry.amountPaise, category: entry.category, occurredAt, note: entry.note, merchant: entry.merchant, source: 'VOICE',
          });
        }
        saved.push(index);
      }
    } catch {
      // Keep only the unsaved entries on screen so a retry can't create duplicates.
      setRemoved(current => new Set([...current, ...saved]));
      setMessage(saved.length ? `${saved.length} saved. Baaki save nahi hue, phir try karo.` : 'Save nahi ho paya. Phir try karo.');
      setSaving(false);
      if (saved.length) {
        notifyEntriesChanged();
        onSaved(saved.length);
      }
      return;
    }
    notifyEntriesChanged();
    const first = entries[0].entry;
    celebrate({ type: first.type, category: first.category, amountPaise: first.amountPaise, extraCount: entries.length - 1 });
    onSaved(entries.length);
    onClose();
  };

  const listening = listenState === 'listening';
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close voice entry" onPress={close} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>Bolkar add karo</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close voice entry" hitSlop={10} onPress={close} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <View style={styles.micRow}>
            <View style={styles.micWrap}>
              {listening ? <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
                onPress={listening ? stopListening : listen}
                style={[styles.micButton, listening && styles.micButtonActive]}
              >
                {listening ? <Square color={colors.white} fill={colors.white} size={22} /> : <Mic color={colors.white} size={28} strokeWidth={2.4} />}
              </Pressable>
            </View>
            <Text variant="label" style={styles.status}>
              {listening ? 'Sun raha hoon… bolo' : transcript ? 'Theek hai? Neeche check karo' : 'Mic dabao aur bolo'}
            </Text>
          </View>

          <TextInput
            accessibilityLabel="What you said"
            multiline
            onChangeText={updateTranscript}
            onFocus={() => stopListening()}
            placeholder={`Jaise: "${EXAMPLES[0]}"`}
            placeholderTextColor={colors.textMuted}
            style={styles.transcript}
            value={transcript}
          />
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            {entries.map(({ entry, index }) => {
              const income = entry.type === 'income';
              return (
                <View key={`${index}-${entry.sourceText}`} style={styles.card}>
                  <CategoryIcon category={entry.category} type={entry.type} size={42} />
                  <View style={styles.cardMeta}>
                    <Text variant="label" numberOfLines={1} style={styles.cardTitle}>{titleOf(entry)}</Text>
                    <Text variant="caption" numberOfLines={1}>{`${entry.category} · ${describeDateInput(entry.date, new Date())}`}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Switch ${titleOf(entry)} to ${income ? 'expense' : 'income'}`}
                    hitSlop={6}
                    onPress={() => setFlipped(current => toggle(current, index))}
                  >
                    <Text variant="label" style={[styles.cardAmount, income ? styles.positive : styles.negative]}>
                      {`${income ? '+' : '−'}${formatRupees(entry.amountPaise)}`}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${titleOf(entry)}`}
                    hitSlop={8}
                    onPress={() => setRemoved(current => new Set([...current, index]))}
                    style={styles.removeButton}
                  >
                    <X color={colors.textMuted} size={16} />
                  </Pressable>
                </View>
              );
            })}
            {parsed.unparsed.map(piece => (
              <Text key={piece} variant="caption" style={styles.unparsed}>{`"${piece}" samajh nahi aaya. Amount bhi bolo.`}</Text>
            ))}
            {!transcript && !listening ? (
              <View style={styles.examples}>
                <Text variant="caption">Aise bol sakte ho:</Text>
                {EXAMPLES.map(example => (
                  <Text key={example} variant="caption" style={styles.example}>{`“${example}”`}</Text>
                ))}
              </View>
            ) : null}
            {entries.length ? <Text variant="caption" style={styles.hint}>Amount par tap karke income/expense badlo.</Text> : null}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save voice entries"
            accessibilityState={{ disabled: !entries.length || saving }}
            disabled={!entries.length || saving}
            onPress={save}
            style={[styles.saveButton, (!entries.length || saving) && styles.saveDisabled]}
          >
            <Check color={colors.white} size={20} strokeWidth={2.8} />
            <Text variant="button" style={styles.saveText}>
              {saving ? 'Saving…' : entries.length > 1 ? `Save ${entries.length} entries` : 'Save entry'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function toggle(set: Set<number>, value: number) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Flipping type keeps amount/date; the category falls back to the other side's "Other". */
function flip(entry: ParsedEntry): ParsedEntry {
  return { ...entry, type: entry.type === 'income' ? 'expense' : 'income', category: 'Other' };
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(34, 31, 44, 0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.md,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radius.full, height: 5, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  micRow: { alignItems: 'center', gap: spacing.sm },
  micWrap: { alignItems: 'center', height: 96, justifyContent: 'center', width: 96 },
  ring: { backgroundColor: colors.primary, borderRadius: radius.full, height: 72, position: 'absolute', width: 72 },
  micButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    elevation: 6,
    height: 72,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 72,
  },
  micButtonActive: { backgroundColor: colors.destructive, shadowColor: colors.destructive },
  status: { color: colors.textMuted },
  transcript: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    color: colors.text,
    fontSize: 17,
    maxHeight: 110,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  message: { color: colors.destructive, textAlign: 'center' },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.sm },
  card: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: 15 },
  cardAmount: { fontSize: 16 },
  positive: { color: colors.success },
  negative: { color: colors.destructive },
  removeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 26, justifyContent: 'center', width: 26 },
  unparsed: { color: colors.warning },
  examples: { gap: 4 },
  example: { color: colors.text },
  hint: { textAlign: 'center' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 54,
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: colors.white },
});
