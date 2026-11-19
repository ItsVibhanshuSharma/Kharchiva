import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { avatarTone } from '../../features/groups/groupFormat';
import { colors, radius, spacing } from '../../theme';
import { initialsOf } from '../profile/profileData';

/** Round initials badge. The colour is stable per name. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const tone = avatarTone(name);
  return (
    <View style={[styles.avatar, { backgroundColor: tone.background, borderRadius: size / 2, height: size, width: size }]}>
      <Text style={{ color: tone.text, fontSize: size * 0.38, fontWeight: '700' }}>{initialsOf(name) || '?'}</Text>
    </View>
  );
}

type Option<T extends string> = { value: T; label: string };

/** Full-width pill switch, like the period switcher on Home. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text variant="label" numberOfLines={1} style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  segmented: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 4 },
  segment: { alignItems: 'center', borderRadius: radius.full, flex: 1, paddingVertical: spacing.sm + 2 },
  segmentActive: { backgroundColor: colors.surface, elevation: 1, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  segmentText: { color: colors.textMuted, fontSize: 13 },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
});
