import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';
import type { BudgetLevel } from './budgetProgress';

export const LEVEL_COLORS: Record<BudgetLevel, string> = {
  ok: colors.primary,
  near: colors.warning,
  over: colors.destructive,
};

/** Thin progress bar; fills to the limit and turns amber near it, red past it. */
export function BudgetBar({ ratio, level, height = 8 }: { ratio: number; level: BudgetLevel; height?: number }) {
  return (
    <View style={[styles.track, { borderRadius: height, height }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: LEVEL_COLORS[level], borderRadius: height, height, width: `${Math.round(Math.min(ratio, 1) * 100)}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, overflow: 'hidden' },
  fill: {},
});
