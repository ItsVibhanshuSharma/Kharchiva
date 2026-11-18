import { formatShortDate } from './dates';

describe('formatShortDate', () => {
  it('uses three-letter months, including Sep', () => {
    expect(formatShortDate('2026-09-10')).toBe('10 Sep 2026');
    expect(formatShortDate('2026-11-07')).toBe('7 Nov 2026');
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
  });
});
