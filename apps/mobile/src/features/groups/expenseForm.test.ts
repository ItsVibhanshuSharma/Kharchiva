import { buildExpenseInput, formFromExpense, previewShares, splitRemainder, type ExpenseForm } from './expenseForm';
import { SplitType } from './groupMath';

const base: ExpenseForm = {
  title: 'Dinner',
  amountText: '900',
  categoryKey: 'food',
  day: '2026-05-01',
  note: '',
  payerId: 'a',
  splitType: SplitType.EQUAL,
  selected: ['a', 'b', 'c'],
  values: {},
};

describe('expense form', () => {
  it('builds an equal split in paise', () => {
    const result = buildExpenseInput(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.amountPaise).toBe(90000);
      expect(result.input.payers).toEqual([{ memberId: 'a', amountPaise: 90000 }]);
      expect(result.input.expenseDate).toBe('2026-05-01T12:00:00.000Z');
    }
    expect(previewShares(base)).toEqual({ a: 30000, b: 30000, c: 30000 });
  });

  it('checks required fields', () => {
    expect(buildExpenseInput({ ...base, title: ' ' })).toMatchObject({ ok: false });
    expect(buildExpenseInput({ ...base, amountText: 'abc' })).toMatchObject({ ok: false });
    expect(buildExpenseInput({ ...base, selected: [] })).toMatchObject({ ok: false });
  });

  it('validates exact amounts and reports what is left', () => {
    const form: ExpenseForm = {
      ...base,
      splitType: SplitType.EXACT,
      selected: ['a', 'b'],
      values: { a: '500', b: '300' },
    };
    expect(buildExpenseInput(form)).toEqual({ ok: false, error: 'The amounts do not add up to the total.' });
    expect(splitRemainder(form)).toBe(10000);
    expect(buildExpenseInput({ ...form, values: { a: '500', b: '400' } }).ok).toBe(true);
  });

  it('validates percentages that must reach 100', () => {
    const form: ExpenseForm = {
      ...base,
      splitType: SplitType.PERCENT,
      selected: ['a', 'b'],
      values: { a: '60', b: '30' },
    };
    expect(buildExpenseInput(form)).toEqual({ ok: false, error: 'The percentages must add up to 100%.' });
    expect(splitRemainder(form)).toBe(1000);
    expect(previewShares({ ...form, values: { a: '60', b: '40' } })).toEqual({ a: 54000, b: 36000 });
  });

  it('fills the form back from a saved expense', () => {
    const form = formFromExpense({
      id: 'e',
      title: 'Cab',
      amountPaise: 45050,
      categoryKey: 'travel',
      note: null,
      expenseDate: '2026-05-02T12:00:00.000Z',
      payers: [{ memberId: 'a', amountPaise: 45050 }],
      splitType: SplitType.EXACT,
      splits: [
        { memberId: 'a', amountPaise: 20000 },
        { memberId: 'b', amountPaise: 25050 },
      ],
      createdByMemberId: 'a',
    });
    expect(form.amountText).toBe('450.5');
    expect(form.day).toBe('2026-05-02');
    expect(buildExpenseInput(form).ok).toBe(true);
  });
});
