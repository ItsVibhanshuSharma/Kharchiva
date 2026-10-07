import React from 'react';
import { StyleSheet, Text as RNText, TextProps as RNTextProps } from 'react-native';
import { colors, typography } from '../theme';

export type TextProps = RNTextProps & {
  variant?:
    | 'title'
    | 'heading'
    | 'body'
    | 'label'
    | 'caption'
    | 'money'
    | 'button'
    | 'muted';
};

export function Text({ children, variant = 'body', style, ...props }: TextProps) {
  return (
    <RNText style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontFamily: 'System',
  },
  title: {
    fontSize: typography.xxxl,
    fontWeight: '700',
    lineHeight: 46,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: '700',
    lineHeight: 30,
  },
  body: {
    fontSize: typography.md,
    lineHeight: typography.md + 6,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.xs,
    lineHeight: 16,
  },
  money: {
    fontSize: typography.xl,
    fontWeight: '700',
    lineHeight: 30,
  },
  button: {
    fontSize: typography.md,
    fontWeight: '700',
    lineHeight: 20,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.sm,
    lineHeight: 18,
  },
});
