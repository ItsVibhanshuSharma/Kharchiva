import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { categoryLook } from '../theme/categories';
import { formatRupees } from '../utils/money';
import { HIDDEN_AMOUNT, isPrivacyOn } from '../features/privacy/privacy';
import { t } from '../i18n/i18n';
import { Text } from './Text';
import { subscribeToCelebrations, type CelebrationEvent } from './celebration';

const VISIBLE_MS = 1700;
const PARTICLE_COUNT = 12;

type Particle = { emoji: string; dx: number; dy: number; rotate: string };

function particlesFor(event: CelebrationEvent, emoji: string): Particle[] {
  const income = event.type === 'income';
  const pool = income ? [emoji, '🎉', '✨', '💵', '🪙'] : [emoji, '💸', '🪶'];
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const pick = pool[index % pool.length];
    if (income) {
      // Burst outward in a full circle.
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const distance = 120 + (index % 3) * 30;
      return { emoji: pick, dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, rotate: `${(index % 2 ? 1 : -1) * 40}deg` };
    }
    // Drift gently down and away, like money floating off.
    const spread = (index - PARTICLE_COUNT / 2) * 22;
    return { emoji: pick, dx: spread, dy: 140 + (index % 4) * 25, rotate: `${spread / 2}deg` };
  });
}

function messageFor(event: CelebrationEvent) {
  const amount = isPrivacyOn() ? HIDDEN_AMOUNT : formatRupees(event.amountPaise);
  const more = event.extraCount ? ` · ${t('+{n} more', { n: event.extraCount })}` : '';
  const category = t(event.category);
  return event.type === 'income'
    ? { title: t('+{amount} added', { amount }), subtitle: t('{category} · Paisa aaya! 🎉{more}', { category, more }) }
    : { title: t('−{amount} spent', { amount }), subtitle: t('{category} · Paisa gaya 🥲{more}', { category, more }) };
}

/** Mounted once at the app root. Non-blocking: touches pass through to the screen below. */
export function CelebrationOverlay() {
  const [event, setEvent] = useState<CelebrationEvent | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const card = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => undefined);
    const unsubscribe = subscribeToCelebrations(next => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      card.setValue(0);
      burst.setValue(0);
      setEvent(next);
    });
    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [burst, card]);

  useEffect(() => {
    if (!event) return;
    AccessibilityInfo.announceForAccessibility?.(messageFor(event).title);
    if (reduceMotion) {
      card.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(card, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
    hideTimer.current = setTimeout(() => {
      Animated.timing(card, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setEvent(null));
    }, VISIBLE_MS);
  }, [burst, card, event, reduceMotion]);

  if (!event) return null;

  const look = categoryLook(event.category, event.type);
  const income = event.type === 'income';
  const { title, subtitle } = messageFor(event);
  const particles = reduceMotion ? [] : particlesFor(event, look.emoji);
  // Income bounces up; an expense gives a small "sigh" wobble.
  const emojiTransform = income
    ? [{ translateY: burst.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, -18, 0, -6] }) }]
    : [{ rotate: burst.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-12deg', '10deg', '-6deg', '0deg'] }) }];

  return (
    <View pointerEvents="none" style={styles.root} testID="celebration-overlay">
      {particles.map((particle, index) => (
        <Animated.Text
          key={index}
          style={[
            styles.particle,
            {
              opacity: burst.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dy] }) },
                { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', particle.rotate] }) },
              ],
            },
          ]}
        >
          {particle.emoji}
        </Animated.Text>
      ))}
      <Animated.View
        style={[
          styles.card,
          { borderColor: income ? colors.success : look.color },
          { opacity: card, transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
        ]}
      >
        <View style={[styles.emojiBubble, { backgroundColor: look.tint }]}>
          <Animated.Text style={[styles.emoji, { transform: emojiTransform }]}>{look.emoji}</Animated.Text>
        </View>
        <Text variant="heading" style={{ color: income ? colors.success : colors.destructive }}>{title}</Text>
        <Text variant="muted">{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  particle: { fontSize: 28, position: 'absolute' },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    elevation: 12,
    gap: spacing.xs,
    minWidth: 240,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  emojiBubble: { alignItems: 'center', borderRadius: radius.full, height: 84, justifyContent: 'center', marginBottom: spacing.xs, width: 84 },
  emoji: { fontSize: 48, lineHeight: 58 },
});
