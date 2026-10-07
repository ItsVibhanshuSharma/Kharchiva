export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 30,
  xxxl: 38,
} as const;

export const colors = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F2EE',
  primary: '#6817D9',
  primaryMuted: '#EADDFC',
  selected: '#F3EAFE',
  text: '#19171D',
  textMuted: '#716D79',
  success: '#087653',
  successMuted: '#D3FFEE',
  warning: '#B9822B',
  destructive: '#B64B52',
  border: '#E5E0EA',
  shadow: '#221F2C',
  white: '#FFFFFF',
} as const;

export const lightTheme = {
  colors,
  spacing,
  radius,
  typography,
  shadows: {
    sm: {
      shadowColor: colors.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: colors.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
  },
} as const;

export type Theme = typeof lightTheme;
export type ColorTokens = typeof colors;
export type SpacingScale = typeof spacing;
export type BorderRadiusScale = typeof radius;
export type TextStyleTokens = typeof typography;
export const KharchivaTheme = lightTheme;
