import {
  SplitError,
  SplitType,
  computeBalances,
  computeShares,
  simplifyDebts,
  validatePayers,
} from './split.util';

const sum = (shares: { amountPaise: number }[]) => shares.reduce((a, s) => a + s.amountPaise, 0);

describe('computeShares', () => {
  it('splits equally and hands leftover paise to the first members', () => {
    const shares = computeShares(1000, SplitType.EQUAL, [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]);
    expect(shares.map((s) => s.amountPaise)).toEqual([334, 333, 333]);
  });

  it('accepts exact amounts that add up', () => {
    const shares = computeShares(1000, SplitType.EXACT, [
      { memberId: 'a', value: 700 },
      { memberId: 'b', value: 300 },
    ]);
    expect(shares.map((s) => s.amountPaise)).toEqual([700, 300]);
  });

  it('rejects exact amounts that do not add up', () => {
    expect(() =>
      computeShares(1000, SplitType.EXACT, [
        { memberId: 'a', value: 700 },
        { memberId: 'b', value: 200 },
      ]),
    ).toThrow(SplitError);
  });

  it('splits by percent without losing a paisa', () => {
    const shares = computeShares(1001, SplitType.PERCENT, [
      { memberId: 'a', value: 3333 },
      { memberId: 'b', value: 3333 },
      { memberId: 'c', value: 3334 },
    ]);
    expect(sum(shares)).toBe(1001);
  });

  it('rejects percentages that are not 100', () => {
    expect(() =>
      computeShares(1000, SplitType.PERCENT, [
        { memberId: 'a', value: 5000 },
        { memberId: 'b', value: 4000 },
      ]),
    ).toThrow('100%');
  });

  it('rejects duplicate members, empty lists and bad totals', () => {
    expect(() => computeShares(100, SplitType.EQUAL, [{ memberId: 'a' }, { memberId: 'a' }])).toThrow(SplitError);
    expect(() => computeShares(100, SplitType.EQUAL, [])).toThrow(SplitError);
    expect(() => computeShares(0, SplitType.EQUAL, [{ memberId: 'a' }])).toThrow(SplitError);
    expect(() => computeShares(1.5, SplitType.EQUAL, [{ memberId: 'a' }])).toThrow(SplitError);
  });
});

describe('validatePayers', () => {
  it('requires payer amounts to equal the total', () => {
    expect(() => validatePayers(1000, [{ memberId: 'a', amountPaise: 900 }])).toThrow(SplitError);
    expect(() => validatePayers(1000, [{ memberId: 'a', amountPaise: 1000 }])).not.toThrow();
  });
});

describe('balances and settle-up', () => {
  it('computes who owes whom for a 4 person trip', () => {
    const everyone = ['a', 'b', 'c', 'd'];
    const expenses = [
      {
        payers: [{ memberId: 'a', amountPaise: 4000 }],
        splits: computeShares(4000, SplitType.EQUAL, everyone.map((memberId) => ({ memberId }))),
      },
      {
        payers: [{ memberId: 'b', amountPaise: 2000 }],
        splits: computeShares(2000, SplitType.EQUAL, everyone.map((memberId) => ({ memberId }))),
      },
    ];
    const balances = computeBalances(expenses, []);
    expect(balances.get('a')).toBe(2500);
    expect(balances.get('b')).toBe(500);
    expect(balances.get('c')).toBe(-1500);
    expect(balances.get('d')).toBe(-1500);
    expect([...balances.values()].reduce((x, y) => x + y, 0)).toBe(0);

    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(3);
    expect(transfers.reduce((x, t) => x + t.amountPaise, 0)).toBe(3000);
  });

  it('accounts for settlements', () => {
    const expenses = [
      {
        payers: [{ memberId: 'a', amountPaise: 1000 }],
        splits: [
          { memberId: 'a', amountPaise: 500 },
          { memberId: 'b', amountPaise: 500 },
        ],
      },
    ];
    const balances = computeBalances(expenses, [{ fromMemberId: 'b', toMemberId: 'a', amountPaise: 500 }]);
    expect(balances.get('a')).toBe(0);
    expect(balances.get('b')).toBe(0);
    expect(simplifyDebts(balances)).toEqual([]);
  });
});
