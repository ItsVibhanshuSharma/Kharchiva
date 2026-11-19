import {
  ME,
  balances,
  computeShares,
  draftFromShares,
  emptyDraft,
  equalShares,
  parsePercent,
  percentShares,
  splitProblem,
  totals,
  withMethod,
  type SplitDraft,
} from './splitMath';

const sum = (shares: { paise: number }[]) => shares.reduce((total, share) => total + share.paise, 0);
const draft = (patch: Partial<SplitDraft>): SplitDraft => ({ ...emptyDraft(), people: ['a', 'b', 'c'], ...patch });

describe('equalShares', () => {
  it('splits evenly', () => {
    expect(equalShares(400000, [ME, 'a', 'b', 'c']).map(share => share.paise)).toEqual([100000, 100000, 100000, 100000]);
  });
  it('gives the leftover paise to the first people so nothing is lost', () => {
    const shares = equalShares(1000, [ME, 'a', 'b']);
    expect(shares.map(share => share.paise)).toEqual([334, 333, 333]);
    expect(sum(shares)).toBe(1000);
  });
});

describe('percentShares', () => {
  it('splits by percentage', () => {
    const shares = percentShares(10000, [
      { personId: ME, basisPoints: 5000 },
      { personId: 'a', basisPoints: 2500 },
      { personId: 'b', basisPoints: 2500 },
    ]);
    expect(shares.map(share => share.paise)).toEqual([5000, 2500, 2500]);
    expect(shares.map(share => share.percent)).toEqual([50, 25, 25]);
  });
  it('always adds up to the total, even when a third does not divide', () => {
    const shares = percentShares(10000, [
      { personId: ME, basisPoints: 3333 },
      { personId: 'a', basisPoints: 3333 },
      { personId: 'b', basisPoints: 3334 },
    ]);
    expect(sum(shares)).toBe(10000);
  });
});

describe('parsePercent', () => {
  it('reads numbers with up to two decimals', () => {
    expect(parsePercent('25')).toBe(2500);
    expect(parsePercent('33.5%')).toBe(3350);
    expect(parsePercent('12.345')).toBeNull();
    expect(parsePercent('0')).toBeNull();
    expect(parsePercent('abc')).toBeNull();
    expect(parsePercent(undefined)).toBeNull();
  });
});

describe('computeShares', () => {
  it('needs a total and at least one friend first', () => {
    expect(computeShares(draft({}), null).problem).toBe('Pehle total amount daalo.');
    expect(computeShares(draft({ people: [] }), 1000).problem).toBe('Pehle dost chuno.');
  });
  it('splits equally between me and the friends', () => {
    const result = computeShares(draft({}), 400000);
    expect(result.shares?.map(share => share.personId)).toEqual([ME, 'a', 'b', 'c']);
    expect(result.shares?.every(share => share.paise === 100000)).toBe(true);
  });
  it('accepts custom amounts that add up and rejects ones that do not', () => {
    const ok = draft({ method: 'CUSTOM', custom: { [ME]: '1500', a: '1000', b: '1000', c: '500' } });
    expect(computeShares(ok, 400000).shares?.map(share => share.paise)).toEqual([150000, 100000, 100000, 50000]);
    const off = draft({ method: 'CUSTOM', custom: { [ME]: '1500', a: '1000', b: '1000', c: '600' } });
    expect(computeShares(off, 400000).problem).toBe('Hisse jodkar total ke barabar hone chahiye.');
    const missing = draft({ method: 'CUSTOM', custom: { [ME]: '2000', a: '2000' } });
    expect(computeShares(missing, 400000).problem).toBe('Har kisi ka hissa daalo.');
  });
  it('accepts percentages that make 100 and rejects others', () => {
    const ok = draft({ method: 'PERCENT', percent: { [ME]: '40', a: '30', b: '20', c: '10' } });
    expect(computeShares(ok, 100000).shares?.map(share => share.paise)).toEqual([40000, 30000, 20000, 10000]);
    const off = draft({ method: 'PERCENT', percent: { [ME]: '40', a: '30', b: '20', c: '20' } });
    expect(computeShares(off, 100000).problem).toBe('Percent jodkar 100 hone chahiye.');
    expect(computeShares(draft({ method: 'PERCENT', percent: { [ME]: '100' } }), 100000).problem).toBe('Har kisi ka percent daalo.');
  });
});

describe('splitProblem', () => {
  const good = [
    { personId: ME, paise: 600 },
    { personId: 'a', paise: 400 },
  ];
  it('accepts a valid split', () => {
    expect(splitProblem(1000, ME, good)).toBeNull();
    expect(splitProblem(1000, 'a', good)).toBeNull();
  });
  it('rejects broken splits', () => {
    expect(splitProblem(0, ME, good)).not.toBeNull();
    expect(splitProblem(1000, ME, [{ personId: ME, paise: 1000 }])).not.toBeNull();
    expect(splitProblem(1000, ME, [{ personId: 'a', paise: 600 }, { personId: 'b', paise: 400 }])).toBe('Aapka hissa zaroori hai.');
    expect(splitProblem(1000, 'z', good)).toBe('Pay karne wala split me hona chahiye.');
    expect(splitProblem(1000, ME, [{ personId: ME, paise: 500 }, { personId: 'a', paise: 400 }])).toBe('Hisse jodkar total ke barabar hone chahiye.');
    expect(splitProblem(1000, ME, [{ personId: ME, paise: 1000 }, { personId: 'a', paise: 0 }])).not.toBeNull();
    expect(splitProblem(1000, ME, [{ personId: ME, paise: 500 }, { personId: ME, paise: 500 }])).not.toBeNull();
  });
});

describe('draftFromShares', () => {
  it('restores what was typed', () => {
    const restored = draftFromShares('PERCENT', 'a', [
      { personId: ME, paise: 700, percent: 70 },
      { personId: 'a', paise: 300, percent: 30 },
    ]);
    expect(restored).toMatchObject({ method: 'PERCENT', people: ['a'], paidBy: 'a', percent: { [ME]: '70', a: '30' }, custom: { [ME]: '7', a: '3' } });
  });
});

describe('balances', () => {
  const dinner = { paidBy: ME, shares: equalShares(400000, [ME, 'a', 'b', 'c']) };
  it('shows what friends owe me when I paid', () => {
    const result = balances([dinner], []);
    expect(result.get('a')).toBe(100000);
    expect(result.has(ME)).toBe(false);
    expect(totals(result.values())).toEqual({ owedToMe: 300000, iOwe: 0 });
  });
  it('shows what I owe when a friend paid', () => {
    const cab = { paidBy: 'a', shares: equalShares(30000, [ME, 'a']) };
    expect(balances([cab], []).get('a')).toBe(-15000);
  });
  it('nets the two directions for one friend', () => {
    const cab = { paidBy: 'a', shares: equalShares(30000, [ME, 'a']) };
    const result = balances([dinner, cab], []);
    expect(result.get('a')).toBe(100000 - 15000);
  });
  it('ignores what two friends owe each other', () => {
    const lunch = { paidBy: 'a', shares: equalShares(9000, [ME, 'a', 'b']) };
    const result = balances([lunch], []);
    expect(result.get('a')).toBe(-3000);
    expect(result.has('b')).toBe(false);
  });
  it('lowers the balance when a settlement is recorded', () => {
    const paidBack = { personId: 'a', direction: 'THEY_PAID_ME' as const, amountPaise: 60000 };
    expect(balances([dinner], [paidBack]).get('a')).toBe(40000);
    const iPaid = { personId: 'a', direction: 'I_PAID_THEM' as const, amountPaise: 5000 };
    const cab = { paidBy: 'a', shares: equalShares(30000, [ME, 'a']) };
    expect(balances([cab], [iPaid]).get('a')).toBe(-10000);
  });
  it('is zero once settled in full', () => {
    const paidBack = { personId: 'a', direction: 'THEY_PAID_ME' as const, amountPaise: 100000 };
    expect(balances([dinner], [paidBack]).get('a')).toBe(0);
  });
});

describe('withMethod', () => {
  it('starts Custom from the equal split', () => {
    const next = withMethod(draft({ people: ['a'] }), 'CUSTOM', 10001);
    expect(next.method).toBe('CUSTOM');
    expect(next.custom).toEqual({ [ME]: '50.01', a: '50' });
    expect(computeShares(next, 10001).shares?.map(share => share.paise)).toEqual([5001, 5000]);
  });
  it('starts Percent from an equal split that adds up to 100', () => {
    const next = withMethod(draft({ people: ['a', 'b'] }), 'PERCENT', 9000);
    expect(next.percent).toEqual({ [ME]: '33.34', a: '33.33', b: '33.33' });
    expect(computeShares(next, 9000).shares?.reduce((total, share) => total + share.paise, 0)).toBe(9000);
  });
  it('keeps numbers the user already typed', () => {
    const typed = draft({ people: ['a'], custom: { [ME]: '70', a: '30' } });
    expect(withMethod(typed, 'CUSTOM', 10000).custom).toEqual({ [ME]: '70', a: '30' });
  });
  it('leaves boxes empty until there is a total', () => {
    expect(withMethod(draft({ people: ['a'] }), 'CUSTOM', null).custom).toEqual({});
  });
});
