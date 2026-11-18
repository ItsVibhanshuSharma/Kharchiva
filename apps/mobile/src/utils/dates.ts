/**
 * Fixed English month names. Intl's en-IN short month for September is "Sept",
 * so labels are built by hand to keep every month at three letters.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SHORT_MONTH_NAMES = MONTH_NAMES.map(name => name.slice(0, 3));

/** "2026-09-10" -> "10 Sep 2026". Returns the input unchanged if it is not YYYY-MM-DD. */
export function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return value;
  return `${Number(match[3])} ${SHORT_MONTH_NAMES[month - 1]} ${match[1]}`;
}
