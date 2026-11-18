import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { MPIN_LENGTH } from '../features/mpin/mpinStore';
import { Text } from './Text';
export type MpinInputProps = {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;
/**
 * MPIN dots with an on-screen number pad. It does not use the system keyboard,
 * which Android does not reliably open for a hidden input.
 */
export function MpinInput({ value, onChange, hasError = false, disabled = false, accessibilityLabel = 'MPIN' }: MpinInputProps) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'back') onChange(value.slice(0, -1));
    else if (value.length < MPIN_LENGTH) onChange(value + key);
  };
  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityLabel={`${accessibilityLabel}, ${value.length} of ${MPIN_LENGTH} digits entered`}
        style={styles.row}
      >
        {Array.from({ length: MPIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[styles.cell, index === value.length && !disabled && styles.activeCell, hasError && styles.errorCell]}
          >
            <Text style={styles.dot}>{index < value.length ? '●' : ''}</Text>
          </View>
        ))}
      </View>
      <View style={styles.pad}>
        {KEYS.map((key, index) =>
          key === '' ? (
            <View key={index} style={styles.key} />
          ) : (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? 'Delete digit' : key}
              disabled={disabled}
              onPress={() => press(key)}
              style={({ pressed }) => [styles.key, styles.keyButton, pressed && styles.keyPressed, disabled && styles.keyDisabled]}
            >
              <Text style={styles.keyText}>{key === 'back' ? '⌫' : key}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xxl, width: '100%' },
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  cell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  activeCell: { borderColor: colors.primary },
  errorCell: { borderColor: colors.destructive },
  dot: { color: colors.text, fontSize: 22 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, rowGap: spacing.md },
  key: { alignItems: 'center', height: 64, justifyContent: 'center', width: '33.33%' },
  keyButton: { borderRadius: radius.full },
  keyPressed: { backgroundColor: colors.primaryMuted },
  keyDisabled: { opacity: 0.4 },
  keyText: { color: colors.text, fontSize: 26, fontWeight: '500' },
});
