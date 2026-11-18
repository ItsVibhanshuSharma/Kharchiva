import { describeDateInput, shiftDateInput } from './expenseInputUtils';
import {dateForExpenseInput, expenseDateToIso, parseRupeesToPaise} from './expenseInputUtils';

describe('expense input conversion', () => {
  it.each([
    ['₹1,234.56', 123456],
    ['850', 85000],
    ['0.01', 1],
  ])('converts %s to integer paise', (value, expected) => {
    expect(parseRupeesToPaise(value)).toBe(expected);
  });

  it.each(['', '0', '-10', '1.999', 'abc', '90071992547410'])('rejects invalid rupee amount %s', value => {
    expect(parseRupeesToPaise(value)).toBeNull();
  });

  it('validates date-only input and stores it as a timezone-aware ISO timestamp', () => {
    const now = new Date('2026-10-13T10:15:00.000Z');
    expect(expenseDateToIso('2026-10-13', now)).toBe('2026-10-13T10:15:00.000Z');
    expect(expenseDateToIso('2026-02-30', now)).toBeNull();
    expect(dateForExpenseInput(new Date('2026-10-13T20:00:00.000Z'))).toBe('2026-10-14');
  });
});

describe('date stepping', () => {
  it('shifts across month and year boundaries and rejects bad input', () => {
    expect(shiftDateInput('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateInput('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateInput('2026-11-17', -10)).toBe('2026-11-07');
    expect(shiftDateInput('2026-02-30', 0)).toBeNull();
    expect(shiftDateInput('bad', 1)).toBeNull();
  });

  it('describes today, yesterday and older dates', () => {
    const now = new Date('2026-11-17T06:00:00.000Z');
    expect(describeDateInput('2026-11-17', now)).toBe('Today');
    expect(describeDateInput('2026-11-16', now)).toBe('Yesterday');
    expect(describeDateInput('2026-11-07', now)).toBe('7 Nov 2026');
  });
});
