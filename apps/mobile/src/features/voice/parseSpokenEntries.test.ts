import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../theme/categories';
import { PARSER_CATEGORIES, parseSpokenEntries } from './parseSpokenEntries';

// Wednesday, 18 Nov 2026.
const TODAY = '2026-11-18';
const parse = (text: string) => parseSpokenEntries(text, TODAY);
const brief = (text: string) =>
  parse(text).entries.map(entry => [entry.type, entry.amountPaise / 100, entry.category, entry.date]);

describe('parseSpokenEntries', () => {
  describe('amounts', () => {
    it.each([
      ['500 petrol', 500],
      ['₹1,200 groceries', 1200],
      ['rs 850 dinner', 850],
      ['850 rupees dinner', 850],
      ['5k shopping', 5000],
      ['2 hazaar ka shopping', 2000],
      ['do hazaar ka shopping', 2000],
      ['paanch sau ki dawai', 500],
      ['1.5 lakh bonus', 150000],
      ['dedh lakh bonus', 150000],
      ['1 lakh 20 hazaar salary', 120000],
      ['2 hazaar 500 rent', 2500],
      ['99.50 chai', 99.5],
      ['५०० पेट्रोल petrol', 500],
    ])('%s -> ₹%d', (text, rupees) => {
      expect(parse(text).entries[0].amountPaise).toBe(Math.round(rupees * 100));
    });
  });

  describe('income or expense', () => {
    it('treats plain spending as expense', () => {
      expect(brief('500 petrol')).toEqual([['expense', 500, 'Fuel', TODAY]]);
    });

    it('detects income from category or "came in" words', () => {
      expect(brief('salary aayi 1 lakh')).toEqual([['income', 100000, 'Salary', TODAY]]);
      expect(brief('bonus mila 5000')).toEqual([['income', 5000, 'Bonus', TODAY]]);
      expect(brief('20000 aaye')).toEqual([['income', 20000, 'Other', TODAY]]);
      expect(brief('client ne 20000 diye freelance')).toEqual([['income', 20000, 'Freelance', TODAY]]);
    });

    it('keeps a spending category as expense even when salary is mentioned', () => {
      expect(brief('salary se 500 petrol')).toEqual([['expense', 500, 'Fuel', TODAY]]);
    });

    it('honours explicit spending words', () => {
      expect(brief('1000 kharch kiye')).toEqual([['expense', 1000, 'Other', TODAY]]);
    });
  });

  describe('categories and merchant', () => {
    it.each([
      ['850 swiggy dinner', 'Food & Dining'],
      ['300 sabzi', 'Groceries'],
      ['200 uber', 'Travel'],
      ['1500 amazon', 'Shopping'],
      ['799 internet bill', 'Bills'],
      ['649 netflix', 'Entertainment'],
      ['400 dawai', 'Health'],
      ['15000 kiraya', 'Rent'],
      ['300 kuch bhi', 'Other'],
    ])('%s -> %s', (text, category) => {
      expect(parse(text).entries[0].category).toBe(category);
    });

    it('extracts a known merchant and keeps the rest as a note', () => {
      expect(parse('850 swiggy dinner').entries[0]).toMatchObject({ merchant: 'Swiggy', note: 'Dinner' });
      expect(parse('500 petrol').entries[0]).toMatchObject({ merchant: null, note: 'Petrol' });
    });

    it('does not repeat the category as the note', () => {
      expect(parse('1 lakh salary').entries[0].note).toBeNull();
    });
  });

  describe('dates', () => {
    it.each([
      ['aaj 500 petrol', '2026-11-18'],
      ['kal 500 petrol', '2026-11-17'],
      ['kal raat 500 dinner', '2026-11-17'],
      ['yesterday 500 petrol', '2026-11-17'],
      ['parso 500 petrol', '2026-11-16'],
      ['3 din pehle 500 petrol', '2026-11-15'],
      ['500 petrol 10 days ago', '2026-11-08'],
      ['pichhle hafte 500 petrol', '2026-11-11'],
      ['monday ko 500 petrol', '2026-11-16'],
      ['last wednesday 500 petrol', '2026-11-11'],
      ['15 november ko 500 petrol', '2026-11-15'],
      ['nov 5 500 petrol', '2026-11-05'],
      ['15/11 ko 500 petrol', '2026-11-15'],
      ['5 tarikh ko 500 petrol', '2026-11-05'],
      ['25 tarikh ko 500 petrol', '2026-10-25'],
      ['20 december 500 petrol', '2025-12-20'],
    ])('%s -> %s', (text, date) => {
      const [entry] = parse(text).entries;
      expect(entry.date).toBe(date);
      expect(entry.amountPaise).toBe(50000);
    });

    it('never returns a future date', () => {
      expect(parse('20 nov 2026 500 petrol').entries[0].date).toBe(TODAY);
    });
  });

  describe('several entries in one sentence', () => {
    it('splits on aur/and/commas and shares a single date', () => {
      expect(brief('kal 500 petrol aur 250 lunch')).toEqual([
        ['expense', 500, 'Fuel', '2026-11-17'],
        ['expense', 250, 'Food & Dining', '2026-11-17'],
      ]);
      expect(brief('500 petrol, 250 lunch and 1200 amazon kal')).toEqual([
        ['expense', 500, 'Fuel', '2026-11-17'],
        ['expense', 250, 'Food & Dining', '2026-11-17'],
        ['expense', 1200, 'Shopping', '2026-11-17'],
      ]);
    });

    it('handles the PRD example', () => {
      expect(brief('Aaj 500 petrol, 250 lunch aur 1200 Amazon.')).toEqual([
        ['expense', 500, 'Fuel', TODAY],
        ['expense', 250, 'Food & Dining', TODAY],
        ['expense', 1200, 'Shopping', TODAY],
      ]);
    });

    it('splits amounts said back to back without a joining word', () => {
      expect(brief('500 petrol 250 lunch')).toEqual([
        ['expense', 500, 'Fuel', TODAY],
        ['expense', 250, 'Food & Dining', TODAY],
      ]);
      expect(brief('petrol 500 lunch 250')).toEqual([
        ['expense', 500, 'Fuel', TODAY],
        ['expense', 250, 'Food & Dining', TODAY],
      ]);
    });

    it('mixes income and expense', () => {
      expect(brief('salary aayi 1 lakh aur 50000 rent diya')).toEqual([
        ['income', 100000, 'Salary', TODAY],
        ['expense', 50000, 'Rent', TODAY],
      ]);
    });

    it('lets each part keep its own date, carrying the last one forward', () => {
      expect(brief('aaj 500 petrol aur kal 250 lunch phir 100 chai')).toEqual([
        ['expense', 500, 'Fuel', '2026-11-18'],
        ['expense', 250, 'Food & Dining', '2026-11-17'],
        ['expense', 100, 'Food & Dining', '2026-11-17'],
      ]);
    });
  });

  describe('things it could not understand', () => {
    it('reports pieces without an amount', () => {
      expect(parse('500 petrol aur lunch bhi')).toEqual({
        entries: [expect.objectContaining({ amountPaise: 50000 })],
        unparsed: ['lunch bhi'],
      });
    });

    it('returns nothing for empty or filler-only input', () => {
      expect(parse('')).toEqual({ entries: [], unparsed: [] });
      expect(parse('aaj')).toEqual({ entries: [], unparsed: [] });
    });
  });

  it('only produces categories the add form offers', () => {
    expect(EXPENSE_CATEGORIES).toEqual(expect.arrayContaining(PARSER_CATEGORIES.expense));
    expect(INCOME_CATEGORIES).toEqual(expect.arrayContaining(PARSER_CATEGORIES.income));
  });
});
