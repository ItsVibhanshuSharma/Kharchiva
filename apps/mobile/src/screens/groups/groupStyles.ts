import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

/** Styles shared by the Splitwise screens. */
export const groupStyles = StyleSheet.create({
  screen: { paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
  headerWrap: { paddingHorizontal: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.xxxl * 2, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  avatar: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40 },
  avatarText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  name: { color: colors.text, fontSize: 15 },
  error: { color: colors.destructive },
  sectionTitle: { color: colors.text, fontSize: 16, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.selected, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

export function toneColor(tone: 'get' | 'owe' | 'even'): string {
  return tone === 'get' ? colors.success : tone === 'owe' ? colors.destructive : colors.textMuted;
}
