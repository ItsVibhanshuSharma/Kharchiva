import { KharchivaTheme, colors, radius, spacing, typography } from './tokens';

describe('Kharchiva theme tokens', () => {
  it('exposes the required color and scale tokens', () => {
    expect(KharchivaTheme.colors.background).toBe(colors.background);
    expect(KharchivaTheme.colors.surface).toBe(colors.surface);
    expect(KharchivaTheme.colors.primary).toBe(colors.primary);
    expect(KharchivaTheme.colors.text).toBe(colors.text);
    expect(KharchivaTheme.colors.textMuted).toBe(colors.textMuted);
    expect(KharchivaTheme.colors.success).toBe(colors.success);
    expect(KharchivaTheme.colors.warning).toBe(colors.warning);
    expect(KharchivaTheme.colors.destructive).toBe(colors.destructive);

    expect(KharchivaTheme.spacing.xs).toBe(spacing.xs);
    expect(KharchivaTheme.radius.md).toBe(radius.md);
    expect(KharchivaTheme.typography.lg).toBe(typography.lg);
  });
});
