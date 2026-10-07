import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { bottomSafeAreaInset } from './layoutInsets';
import { Text } from './Text';

export { BOTTOM_NAVIGATION_CONTENT_INSET } from './layoutInsets';

export type BottomNavigationItem = {
  id: string;
  label: string;
  active?: boolean;
};

export type BottomNavigationProps = {
  items: BottomNavigationItem[];
  onSelect?: (id: string) => void;
};

export function BottomNavigation({ items, onSelect }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: bottomSafeAreaInset(insets.bottom) }]}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.id === 'add'
              ? 'Add expense'
              : item.id === 'transactions'
                ? 'Transactions'
                : item.id === 'reports'
                  ? 'Reports'
                  : item.label
          }
          accessibilityState={{ selected: Boolean(item.active) }}
          key={item.id}
          onPress={() => onSelect?.(item.id)}
          style={[
            styles.item,
            item.id === 'add' && styles.addItem,
          ]}
        >
          {item.id === 'add' ? (
            <>
              <View style={styles.addCircle}><Text style={styles.addGlyph}>＋</Text></View>
              <Text variant="caption" style={styles.addCaption}>Add Expense</Text>
            </>
          ) : (
            <>
              <View style={[styles.iconFrame, item.active && styles.activeIconFrame]}>
                <Text style={[styles.icon, item.active && styles.activeIcon]}>{iconFor(item.id)}</Text>
              </View>
              <Text variant="caption" style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function iconFor(id: string) {
  switch (id) {
    case 'home': return '⌂';
    case 'transactions': return '↕';
    case 'reports': return '▤';
    case 'profile': return '♙';
    default: return '•';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingVertical: 2,
  },
  addItem: {
    justifyContent: 'flex-end',
    minHeight: 72,
    paddingBottom: 2,
  },
  iconFrame: { alignItems: 'center', borderRadius: radius.full, height: 31, justifyContent: 'center', width: 38 },
  activeIconFrame: { backgroundColor: colors.primaryMuted },
  icon: { color: colors.textMuted, fontSize: 22, lineHeight: 26 },
  activeIcon: { color: colors.primary },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  addCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 4,
    elevation: 6,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    top: -15,
    width: 58,
  },
  addGlyph: { color: colors.white, fontSize: 31, fontWeight: '400', lineHeight: 35, marginTop: -2 },
  addCaption: { color: colors.primary, fontSize: 10, fontWeight: '600' },
});
