import { dayLabel, dayState, missingDays, monthCompleteness } from './catchUp';

// Wednesday, 18 Nov 2026.
const TODAY = '2026-11-18';

describe('catchUp', () => {
  it('a day with entries is recorded, a marked day is not a gap, anything else is missing', () => {
    const recorded = new Set(['2026-11-17']);
    const nothing = new Set(['2026-11-16']);
    expect(dayState('2026-11-17', recorded, nothing)).toBe('RECORDED');
    expect(dayState('2026-11-16', recorded, nothing)).toBe('NO_EXPENSE');
    expect(dayState('2026-11-15', recorded, nothing)).toBe('MISSING');
    // An entry wins over an earlier "nothing" mark.
    expect(dayState('2026-11-16', new Set(['2026-11-16']), nothing)).toBe('RECORDED');
  });

  it('lists past missing days newest first, never today, never before the first activity', () => {
    const recorded = new Set(['2026-11-17', '2026-11-13']);
    const nothing = new Set(['2026-11-15']);
    expect(missingDays(TODAY, '2026-11-13', recorded, nothing)).toEqual(['2026-11-16', '2026-11-14']);
    expect(missingDays(TODAY, null, recorded, nothing)).toEqual([]);
  });

  it('only looks back a week', () => {
    expect(missingDays(TODAY, '2026-10-01', new Set(), new Set())).toHaveLength(7);
  });

  it('counts month completeness from the 1st or the first activity, whichever is later', () => {
    const recorded = new Set(['2026-11-10', '2026-11-12', '2026-11-18']);
    const nothing = new Set(['2026-11-11']);
    expect(monthCompleteness(TODAY, '2026-11-10', recorded, nothing)).toEqual({ covered: 4, total: 9 });
    expect(monthCompleteness(TODAY, '2026-09-01', recorded, nothing)).toEqual({ covered: 4, total: 18 });
    expect(monthCompleteness(TODAY, null, recorded, nothing)).toBeNull();
  });

  it('labels days with a weekday', () => {
    expect(dayLabel('2026-11-16')).toBe('Mon, 16 Nov');
  });
});
