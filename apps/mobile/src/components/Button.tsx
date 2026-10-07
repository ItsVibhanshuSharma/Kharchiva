import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Text } from './Text';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  children: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary';
};

export function Button({
  children,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  const buttonStyle: ViewStyle[] = [
    styles.base,
    variant === 'primary' ? styles.primary : styles.secondary,
  ];

  return (
    <Pressable style={[buttonStyle, style]} {...props}>
      <Text variant="button" style={{ color: variant === 'primary' ? colors.white : colors.text }}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
});
