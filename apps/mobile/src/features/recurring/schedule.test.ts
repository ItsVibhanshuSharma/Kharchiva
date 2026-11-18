import { dueOccurrences, nextOccurrence } from './schedule';

describe('recurring schedule', () => {
  it('repeats monthly on the start day, clamped for short months', () => {
    const anchor = '2026-01-31';
    expect(nextOccurrence('2026-01-31', anchor, 'MONTHLY')).toBe('2026-02-28');
    expect(nextOccurrence('2026-02-28', anchor, 'MONTHLY')).toBe('2026-03-31');
    expect(nextOccurrence('2026-03-31', anchor, 'MONTHLY')).toBe('2026-04-30');
    expect(nextOccurrence('2026-12-31', anchor, 'MONTHLY')).toBe('2027-01-31');
    expect(nextOccurrence('2028-01-31', '2028-01-31', 'MONTHLY')).toBe('2028-02-29');
  });

  it('repeats weekly and yearly', () => {
    expect(nextOccurrence('2026-12-29', '2026-12-29', 'WEEKLY')).toBe('2027-01-05');
    expect(nextOccurrence('2028-02-29', '2028-02-29', 'YEARLY')).toBe('2029-02-28');
    expect(nextOccurrence('2029-02-28', '2028-02-29', 'YEARLY')).toBe('2030-02-28');
  });

  it('lists every due occurrence up to today and the one after', () => {
    expect(dueOccurrences('2026-09-01', '2026-09-01', 'MONTHLY', '2026-11-18')).toEqual({
      due: ['2026-09-01', '2026-10-01', '2026-11-01'],
      next: '2026-12-01',
    });
    expect(dueOccurrences('2026-12-01', '2026-12-01', 'MONTHLY', '2026-11-18')).toEqual({ due: [], next: '2026-12-01' });
  });

  it('caps back-filling after a long gap', () => {
    const { due, next } = dueOccurrences('2026-01-05', '2026-01-05', 'WEEKLY', '2026-11-18', 3);
    expect(due).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
    expect(next).toBe('2026-01-26');
  });
});
