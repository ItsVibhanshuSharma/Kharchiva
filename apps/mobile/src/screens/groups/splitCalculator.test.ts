import {allocateWeightedCents, calculateSplit, formatINR, parseRupeesToPaise} from './splitCalculator';

describe('splitCalculator', () => {
  it('divides an equal split exactly down to the paise', () => {
    const result = calculateSplit(240000, ['a', 'b', 'c', 'd'], 'equal', {});
    expect(Object.values(result.shares)).toEqual([60000, 60000, 60000, 60000]);
    expect(result.allocatedCents).toBe(result.totalCents);
    expect(result.remainingCents).toBe(0);
    expect(result.exactMatch).toBe(true);
  });

  it('allocates weighted shares and distributes fractional paise without loss', () => {
    expect(allocateWeightedCents(240000, [1, 2, 1])).toEqual([60000, 120000, 60000]);
    const rounded = allocateWeightedCents(10001, [1, 1, 1]);
    expect(rounded).toEqual([3334, 3334, 3333]);
    expect(rounded.reduce((sum, value) => sum + value, 0)).toBe(10001);
  });

  it('updates percent and exact shares from local inputs', () => {
    const percentages = calculateSplit(240000, ['a', 'b', 'c', 'd'], 'percent', {a: '40', b: '20', c: '20', d: '20'});
    expect(Object.values(percentages.shares)).toEqual([96000, 48000, 48000, 48000]);
    expect(percentages.allocatedCents).toBe(240000);
    const exact = calculateSplit(240000, ['a', 'b', 'c', 'd'], 'exact', {a: '700', b: '600', c: '600', d: '500'});
    expect(exact.allocatedCents).toBe(240000);
    expect(exact.remainingCents).toBe(0);
    expect(parseRupeesToPaise('2,400.50')).toBe(240050);
    expect(formatINR(12345600)).toBe('₹1,23,456');
    expect(formatINR(120050)).toBe('₹1,200.50');
  });

  it('reconciles every supported split method to the same full bill', () => {
    const modes = [
      calculateSplit(10001, ['a', 'b', 'c'], 'equal', {}),
      calculateSplit(10001, ['a', 'b', 'c'], 'percent', {a: '33.33', b: '33.33', c: '33.34'}),
      calculateSplit(10001, ['a', 'b', 'c'], 'shares', {a: '1', b: '2', c: '1'}),
      calculateSplit(10001, ['a', 'b', 'c'], 'exact', {a: '33.34', b: '33.33', c: '33.34'}),
    ];

    modes.forEach(result => {
      expect(result.allocatedCents).toBe(10001);
      expect(result.remainingCents).toBe(0);
      expect(Object.values(result.shares).reduce((sum, amount) => sum + amount, 0)).toBe(10001);
    });
  });
});
