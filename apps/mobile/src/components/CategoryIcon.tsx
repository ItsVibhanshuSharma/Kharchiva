import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { customCategoryFor, useCatalog } from '../features/catalog/catalogStore';
import { categoryLook } from '../theme/categories';
import { radius } from '../theme';

export type CategoryIconProps = {
  category: string;
  type: 'expense' | 'income';
  size?: number;
  /** Render on a solid colour (e.g. a selected chip) instead of the soft tint. */
  inverted?: boolean;
};

export function CategoryIcon({ category, type, size = 44, inverted = false }: CategoryIconProps) {
  const catalog = useCatalog();
  const { Icon, color, tint } = categoryLook(category, type);
  // The user's own categories can carry an emoji; it wins over the name-based icon.
  const emoji = customCategoryFor(catalog, category, type)?.emoji;
  return (
    <View
      style={[
        styles.box,
        inverted ? styles.invertedBox : { backgroundColor: tint },
        { borderRadius: size * 0.32, height: size, width: size },
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.62) }}>{emoji}</Text>
      ) : (
        <Icon color={inverted ? '#FFFFFF' : color} size={Math.round(size * 0.5)} strokeWidth={2.2} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center' },
  invertedBox: { backgroundColor: 'rgba(255,255,255,0.22)' },
});
