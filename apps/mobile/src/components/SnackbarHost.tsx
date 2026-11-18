import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { Check, X } from './icons';
import { bottomSafeAreaInset } from './layoutInsets';
import { subscribeToSnackbar, type SnackbarOptions } from './snackbar';
import { Text } from './Text';

/** Clears the bottom bar (its height plus the raised "+" button). */
const ABOVE_BOTTOM_BAR = 92;

/** Mounted once at the app root. Only the card itself takes touches. */
export function SnackbarHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<SnackbarOptions | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    const unsubscribe = subscribeToSnackbar(next => {
      clear();
      setCurrent(next);
      AccessibilityInfo.announceForAccessibility?.(next.message);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => dismiss(), next.durationMs ?? (next.action ? 5000 : 3000));
    });
    return () => {
      unsubscribe();
      clear();
    };
    // dismiss only touches stable refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const dismiss = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setCurrent(null));
  };

  if (!current) return null;

  const tone = current.tone ?? 'success';
  const iconColor = tone === 'error' ? '#FFB4B4' : tone === 'success' ? '#7CF5C4' : colors.white;

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: ABOVE_BOTTOM_BAR + bottomSafeAreaInset(insets.bottom) }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
        testID="snackbar"
      >
        <View style={[styles.icon, { borderColor: iconColor }]}>
          {tone === 'error' ? <X color={iconColor} size={14} strokeWidth={3} /> : <Check color={iconColor} size={14} strokeWidth={3} />}
        </View>
        <Text variant="label" numberOfLines={2} style={styles.message}>{current.message}</Text>
        {current.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={current.action.label}
            hitSlop={8}
            onPress={() => {
              current.action?.onPress();
              dismiss();
            }}
          >
            <Text variant="label" style={styles.action}>{current.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { left: spacing.lg, position: 'absolute', right: spacing.lg },
  card: {
    alignItems: 'center',
    backgroundColor: '#1F1B2E',
    borderRadius: radius.lg,
    elevation: 10,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  icon: { alignItems: 'center', borderRadius: radius.full, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  message: { color: colors.white, flex: 1, fontSize: 14 },
  action: { color: '#C9A8FF', fontSize: 14, fontWeight: '700' },
});
