import {
  dayCount,
  matchPreset,
  monthsInRange,
  normalizeRange,
  presetRange,
  rangeFileName,
  rangeTitle,
  rangeToIso,
} from './statementRange';

// Wednesday, 18 Nov 2026.
const TODAY = '2026-11-18';

describe('statementRange', () => {
  it.each([
    ['last7', '2026-11-12', '2026-11-18'],
    ['last30', '2026-10-20', '2026-11-18'],
    ['thisMonth', '2026-11-01', '2026-11-18'],
    ['lastMonth', '2026-10-01', '2026-10-31'],
    ['thisYear', '2026-01-01', '2026-11-18'],
    ['lastYear', '2025-01-01', '2025-12-31'],
  ] as const)('%s -> %s … %s', (preset, from, to) => {
    expect(presetRange(preset, TODAY)).toEqual({ from, to });
    expect(matchPreset({ from, to }, TODAY)).toBe(preset);
  });

  it('wraps "last month" across the new year', () => {
    expect(presetRange('lastMonth', '2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('marks other ranges as custom and keeps them sane', () => {
    expect(matchPreset({ from: '2026-11-08', to: '2026-11-18' }, TODAY)).toBe('custom');
    expect(normalizeRange({ from: '2026-11-20', to: '2026-12-31' }, TODAY)).toEqual({ from: '2026-11-18', to: '2026-11-18' });
    expect(normalizeRange({ from: '2026-11-10', to: '2026-11-01' }, TODAY)).toEqual({ from: '2026-11-01', to: '2026-11-01' });
  });

  it('covers whole India-time days', () => {
    expect(rangeToIso({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: '2026-09-30T18:30:00.000Z',
      to: '2026-10-31T18:29:59.999Z',
    });
    expect(dayCount({ from: '2026-11-09', to: '2026-11-18' })).toBe(10);
    expect(dayCount({ from: '2026-11-18', to: '2026-11-18' })).toBe(1);
  });

  it('lists months across a year boundary', () => {
    expect(monthsInRange({ from: '2025-11-15', to: '2026-02-01' })).toEqual([
      { year: 2025, month: 11 }, { year: 2025, month: 12 }, { year: 2026, month: 1 }, { year: 2026, month: 2 },
    ]);
  });

  it('titles and names files by what the range is', () => {
    expect(rangeTitle({ from: '2026-10-01', to: '2026-10-31' })).toBe('October 2026');
    expect(rangeFileName({ from: '2026-10-01', to: '2026-10-31' })).toBe('Kharchiva-Statement-2026-10');
    expect(rangeTitle({ from: '2025-01-01', to: '2025-12-31' })).toBe('2025');
    expect(rangeFileName({ from: '2025-01-01', to: '2025-12-31' })).toBe('Kharchiva-Statement-2025');
    expect(rangeTitle({ from: '2026-11-09', to: '2026-11-18' })).toBe('9 Nov – 18 Nov 2026');
    expect(rangeTitle({ from: '2025-12-20', to: '2026-01-05' })).toBe('20 Dec 2025 – 5 Jan 2026');
    expect(rangeFileName({ from: '2026-11-09', to: '2026-11-18' })).toBe('Kharchiva-Statement-2026-11-09_to_2026-11-18');
    expect(rangeTitle({ from: '2026-11-18', to: '2026-11-18' })).toBe('18 Nov 2026');
  });
});
