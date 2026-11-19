import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Text';
import { useLanguage } from '../../i18n/i18n';
import { Check, X } from '../../components/icons';
import { MAX_NAME_LENGTH } from '../../database/repositories/CatalogRepository';
import { colors, radius, spacing } from '../../theme';

/** Common picks for personal categories; the first is the default. */
export const CATEGORY_EMOJIS = [
  '🏷️', '🏋️', '🐾', '🎮', '💇', '👶', '🎁', '🍺', '☕', '🍕', '👗', '📱',
  '💡', '🎓', '🙏', '🏥', '🚗', '✈️', '🏠', '🛠️', '📦', '🎨', '⚽', '💰',
];

export type NewItemSheetProps = {
  visible: boolean;
  title: string;
  placeholder: string;
  /** Show the emoji row (for categories, not payment sources). */
  withEmoji?: boolean;
  onClose: () => void;
  /** Resolve to save and close; throw an Error with a user-facing message to stay open. */
  onSave: (name: string, emoji: string | null) => Promise<void>;
};

export function NewItemSheet({ visible, title, placeholder, withEmoji = false, onClose, onSave }: NewItemSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(CATEGORY_EMOJIS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setEmoji(CATEGORY_EMOJIS[0]);
      setError('');
      setSaving(false);
    }
  }, [visible]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(name, withEmoji ? emoji : null);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : 'Save nahi ho paya. Phir try karo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="New name"
            autoFocus
            maxLength={MAX_NAME_LENGTH}
            onChangeText={value => {
              setName(value);
              setError('');
            }}
            onSubmitEditing={save}
            placeholder={t(placeholder)}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={name}
          />
          {withEmoji ? (
            <View style={styles.emojiGrid}>
              {CATEGORY_EMOJIS.map(item => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Emoji ${item}`}
                  accessibilityState={{ selected: emoji === item }}
                  key={item}
                  onPress={() => setEmoji(item)}
                  style={[styles.emojiCell, emoji === item && styles.emojiSelected]}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save new item"
            disabled={saving}
            onPress={save}
            style={[styles.saveButton, saving && styles.disabled]}
          >
            <Check color={colors.white} size={20} strokeWidth={2.8} />
            <Text variant="button" style={styles.saveText}>{saving ? 'Saving…' : 'Jodo'}</Text>
          </Pressable>
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
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    color: colors.text,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' },
  emojiCell: { alignItems: 'center', borderRadius: radius.md, height: 44, justifyContent: 'center', width: '14%' },
  emojiSelected: { backgroundColor: colors.primaryMuted },
  emoji: { fontSize: 24, lineHeight: 30 },
  error: { color: colors.destructive, textAlign: 'center' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  saveText: { color: colors.white },
});
