import { buildMonthGrid, calendarMonthLabel, parseDateString, shiftCalendarMonth } from './calendarUtils';

describe('calendarUtils', () => {
  it('builds a Monday-first grid with padding', () => {
    // 1 Nov 2026 is a Sunday, so it is the last cell of the first week.
    const weeks = buildMonthGrid({ year: 2026, month: 11 });
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every(week => week.length === 7)).toBe(true);
    // 1 Sep 2026 is a Tuesday: one empty cell (Monday) first.
    expect(buildMonthGrid({ year: 2026, month: 9 })[0].slice(0, 2)).toEqual([null, '2026-09-01']);
    // 1 Jun 2026 is a Monday: no padding.
    expect(buildMonthGrid({ year: 2026, month: 6 })[0][0]).toBe('2026-06-01');
  });

  it('handles leap years and month shifting', () => {
    expect(buildMonthGrid({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
    expect(shiftCalendarMonth({ year: 2026, month: 1 }, -2)).toEqual({ year: 2025, month: 11 });
    expect(calendarMonthLabel({ year: 2026, month: 9 })).toBe('September 2026');
  });

  it('parses only real calendar dates', () => {
    expect(parseDateString('2026-11-17')).toEqual({ year: 2026, month: 11, day: 17 });
    expect(parseDateString('2026-02-30')).toBeNull();
    expect(parseDateString('17/11/2026')).toBeNull();
  });
});
