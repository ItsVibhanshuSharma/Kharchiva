import { spacing } from '../theme';

/** The center add control rises 15dp above the shared navigation surface. */
export const BOTTOM_NAVIGATION_CONTENT_INSET = spacing.md + 15;

/** Keeps the last scroll item visually clear of a sibling fixed action footer. */
export const FIXED_ACTION_SCROLL_GAP = spacing.lg;

export function bottomSafeAreaInset(bottomInset: number) {
  return Math.max(bottomInset, spacing.md);
}

/** Content clearance for an overlaid fixed footer, derived from its measured height. */
export function fixedFooterContentInset(
  footerHeight: number,
  bottomInset: number,
  gap: number = FIXED_ACTION_SCROLL_GAP,
) {
  return footerHeight + bottomSafeAreaInset(bottomInset) + gap;
}
