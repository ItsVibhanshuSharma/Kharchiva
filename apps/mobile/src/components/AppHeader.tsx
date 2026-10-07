import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Text } from './Text';

export type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  rightAction?: string;
  onRightAction?: () => void;
  showBack?: boolean;
  onBack?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  rightAction,
  onRightAction,
  showBack = false,
  onBack,
}: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leading}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text variant="title" style={styles.backIcon}>
              ←
            </Text>
          </Pressable>
        ) : null}
      </View>

      {(title || subtitle) && (
        <View style={styles.titleBlock}>
          {title ? (
            <Text variant="title" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.trailing}>
        {rightAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightAction}
            onPress={onRightAction}
            style={styles.actionButton}
          >
            <Text variant="label" numberOfLines={1} style={styles.actionText}>
              {rightAction}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  leading: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 44,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 44,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backIcon: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 24,
  },
  actionButton: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    color: colors.primary,
  },
});
