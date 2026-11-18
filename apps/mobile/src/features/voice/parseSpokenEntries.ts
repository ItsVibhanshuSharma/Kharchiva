/**
 * Turns a spoken (or typed) Hinglish/English sentence into income/expense drafts.
 *
 *   "aaj 500 petrol aur 250 lunch"      -> two expenses today
 *   "kal salary aayi 1 lakh"            -> income ₹1,00,000 yesterday
 *   "850 swiggy dinner 3 din pehle"     -> expense, Food & Dining, merchant Swiggy
 *
 * Rule-based on purpose (PRD §40: no AI dependency for core features). Output is
 * always a draft the user confirms before anything is saved.
 */

export type EntryType = 'expense' | 'income';

export type ParsedEntry = {
  type: EntryType;
  amountPaise: number;
  category: string;
  /** Calendar date, YYYY-MM-DD, never after `today`. */
  date: string;
  merchant: string | null;
  note: string | null;
  /** The piece of the sentence this entry came from. */
  sourceText: string;
};

export type ParseResult = {
  entries: ParsedEntry[];
  /** Pieces that looked like an entry but had no amount. */
  unparsed: string[];
};

// ---------------------------------------------------------------- numbers

const MULTIPLIERS: Record<string, number> = {
  crore: 1_00_00_000, cr: 1_00_00_000,
  lakh: 1_00_000, lakhs: 1_00_000, lac: 1_00_000, lacs: 1_00_000,
  hazaar: 1_000, hazar: 1_000, hajar: 1_000, hazzar: 1_000, thousand: 1_000, k: 1_000,
  sau: 100, hundred: 100,
};

// Number words only count when followed by a multiplier ("do hazaar", "ek lakh"),
// because words like "do" also mean "give" in Hindi.
const NUMBER_WORDS: Record<string, number> = {
  ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4,
  paanch: 5, panch: 5, five: 5, chhe: 6, che: 6, six: 6, saat: 7, seven: 7,
  aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10, bees: 20, twenty: 20,
  pachas: 50, pachaas: 50, fifty: 50, dedh: 1.5, derh: 1.5, dhai: 2.5, dhaai: 2.5, adhai: 2.5,
};

const MULTIPLIER_PATTERN = Object.keys(MULTIPLIERS).join('|');
const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS).join('|');

const AMOUNT_RE = new RegExp(
  `(?:(\\d+(?:\\.\\d+)?)|\\b(${NUMBER_WORD_PATTERN})(?=\\s+(?:${MULTIPLIER_PATTERN})\\b))(?:\\s*(${MULTIPLIER_PATTERN})\\b)?`,
  'g',
);

type AmountMatch = { value: number; multiplier: number; start: number; end: number };

function findAmounts(text: string): AmountMatch[] {
  const raw: AmountMatch[] = [];
  for (const match of text.matchAll(AMOUNT_RE)) {
    const base = match[1] !== undefined ? Number(match[1]) : NUMBER_WORDS[match[2]];
    const multiplier = match[3] ? MULTIPLIERS[match[3]] : 1;
    if (!Number.isFinite(base)) continue;
    raw.push({ value: base * multiplier, multiplier, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  // Merge "1 lakh 20 hazaar" / "2 hazaar 500" into one amount.
  const merged: AmountMatch[] = [];
  for (const current of raw) {
    const previous = merged[merged.length - 1];
    const gap = previous ? text.slice(previous.end, current.start) : '';
    if (previous && previous.multiplier > 1 && /^\s*$/.test(gap) && current.value < previous.multiplier) {
      previous.value += current.value;
      previous.end = current.end;
      previous.multiplier = current.multiplier;
    } else {
      merged.push({ ...current });
    }
  }
  return merged.filter(item => item.value > 0);
}

// ---------------------------------------------------------------- dates

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAYS: Record<string, number> = {
  sunday: 0, ravivar: 0, itwar: 0, monday: 1, somvar: 1, tuesday: 2, mangalvar: 2,
  wednesday: 3, budhvar: 3, thursday: 4, guruvar: 4, friday: 5, shukravar: 5, saturday: 6, shanivar: 6,
};

function toParts(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const { year, month, day } = toParts(date);
  return fromUtc(new Date(Date.UTC(year, month - 1, day + days)));
}

function makeDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return fromUtc(date);
}

/** A day/month without a year means the most recent such date on or before today. */
function pastDayMonth(day: number, month: number, year: number | null, today: string): string | null {
  const current = toParts(today);
  if (year !== null) return makeDate(year < 100 ? 2000 + year : year, month, day);
  const thisYear = makeDate(current.year, month, day);
  if (thisYear && thisYear <= today) return thisYear;
  return makeDate(current.year - 1, month, day);
}

type DateRule = { re: RegExp; resolve: (match: RegExpMatchArray, today: string) => string | null };

const DATE_RULES: DateRule[] = [
  {
    re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}\\b(?:\\s+(\\d{4}))?`),
    resolve: (m, today) => pastDayMonth(Number(m[1]), MONTHS.indexOf(m[2].slice(0, 3)) + 1, m[3] ? Number(m[3]) : null, today),
  },
  {
    re: new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`),
    resolve: (m, today) => pastDayMonth(Number(m[2]), MONTHS.indexOf(m[1].slice(0, 3)) + 1, m[3] ? Number(m[3]) : null, today),
  },
  {
    // Indian order: day/month[/year]
    re: /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
    resolve: (m, today) => pastDayMonth(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null, today),
  },
  {
    // "15 tarikh" -> the 15th of this month, or last month if that is still ahead.
    re: /\b(\d{1,2})\s*(?:tarikh|tareekh|tarik)\b/,
    resolve: (m, today) => {
      const { year, month } = toParts(today);
      const candidate = makeDate(year, month, Number(m[1]));
      if (candidate && candidate <= today) return candidate;
      return month === 1 ? makeDate(year - 1, 12, Number(m[1])) : makeDate(year, month - 1, Number(m[1]));
    },
  },
  {
    re: new RegExp(`\\b(\\d+|${NUMBER_WORD_PATTERN})\\s*(?:din|dino|dinon|days?)\\s*(?:pehle|pahle|pehele|ago|back)\\b`),
    resolve: (m, today) => addDays(today, -(/^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]])),
  },
  { re: /\b(?:pichhle|pichle|picchle|last)\s+(?:hafte|hafta|week)\b/, resolve: (_m, today) => addDays(today, -7) },
  {
    re: new RegExp(`\\b(last\\s+|pichhle\\s+|pichle\\s+)?(${Object.keys(WEEKDAYS).join('|')})\\b`),
    resolve: (m, today) => {
      const { year, month, day } = toParts(today);
      const todayWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      let back = (todayWeekday - WEEKDAYS[m[2]] + 7) % 7;
      if (back === 0 && m[1]) back = 7;
      return addDays(today, -back);
    },
  },
  { re: /\b(?:parso|parson|parsoon|day before yesterday)\b/, resolve: (_m, today) => addDays(today, -2) },
  { re: /\b(?:kal\s+raat|kal|yesterday|last\s+night)\b/, resolve: (_m, today) => addDays(today, -1) },
  { re: /\b(?:aaj|aj|today|abhi)\b/, resolve: (_m, today) => today },
];

/** Finds the first date phrase. Returns the date and the text with the phrase removed. */
function extractDate(text: string, today: string): { date: string | null; rest: string } {
  for (const rule of DATE_RULES) {
    const match = text.match(rule.re);
    if (!match) continue;
    const resolved = rule.resolve(match, today);
    if (!resolved) continue;
    const date = resolved > today ? today : resolved;
    return { date, rest: `${text.slice(0, match.index)} ${text.slice((match.index ?? 0) + match[0].length)}` };
  }
  return { date: null, rest: text };
}

// ---------------------------------------------------------------- meaning

type CategoryRule = { category: string; words: string[] };

const EXPENSE_CATEGORIES: CategoryRule[] = [
  { category: 'Fuel', words: ['petrol', 'diesel', 'fuel', 'cng'] },
  { category: 'Food & Dining', words: ['food', 'khana', 'khaana', 'lunch', 'dinner', 'breakfast', 'nashta', 'swiggy', 'zomato', 'restaurant', 'hotel', 'pizza', 'burger', 'biryani', 'chai', 'tea', 'coffee', 'snack', 'snacks', 'momos', 'dhaba'] },
  { category: 'Groceries', words: ['grocery', 'groceries', 'sabzi', 'sabji', 'vegetables', 'vegetable', 'fruits', 'doodh', 'milk', 'kirana', 'ration', 'blinkit', 'zepto', 'bigbasket', 'instamart', 'atta', 'dmart'] },
  { category: 'Travel', words: ['travel', 'cab', 'uber', 'ola', 'rapido', 'auto', 'rickshaw', 'bus', 'train', 'metro', 'flight', 'ticket', 'taxi', 'toll', 'parking'] },
  { category: 'Shopping', words: ['shopping', 'amazon', 'flipkart', 'myntra', 'meesho', 'clothes', 'kapde', 'kapda', 'shoes', 'joote'] },
  { category: 'Bills', words: ['bill', 'bills', 'electricity', 'bijli', 'light', 'internet', 'wifi', 'broadband', 'recharge', 'mobile', 'phone', 'gas', 'cylinder', 'water', 'paani', 'dth', 'emi', 'insurance'] },
  { category: 'Entertainment', words: ['movie', 'movies', 'film', 'netflix', 'hotstar', 'prime', 'spotify', 'ott', 'game', 'games', 'party'] },
  { category: 'Health', words: ['medicine', 'medicines', 'dawai', 'dawa', 'doctor', 'hospital', 'pharmacy', 'chemist', 'health', 'gym', 'test'] },
  { category: 'Rent', words: ['rent', 'kiraya', 'kiraaya', 'kiraya'] },
];

const INCOME_CATEGORIES: CategoryRule[] = [
  { category: 'Salary', words: ['salary', 'sallary', 'salery', 'tankha', 'tankhwah', 'pagaar', 'pagar'] },
  { category: 'Freelance', words: ['freelance', 'freelancing', 'client', 'project'] },
  { category: 'Business', words: ['business', 'dhanda', 'dukaan', 'dukan', 'sale', 'sales'] },
  { category: 'Bonus', words: ['bonus', 'incentive', 'gift', 'shagun'] },
  { category: 'Interest', words: ['interest', 'byaj', 'byaaj', 'fd', 'dividend'] },
];

/** Every category name the parser can return (used to keep it in sync with the add form). */
export const PARSER_CATEGORIES = {
  expense: [...EXPENSE_CATEGORIES.map(rule => rule.category), 'Other'],
  income: [...INCOME_CATEGORIES.map(rule => rule.category), 'Other'],
};

// Words that mean money came in. Category words for income also imply income.
const INCOME_WORDS = ['income', 'aaya', 'aaye', 'aayi', 'aai', 'aya', 'aye', 'ayi', 'mila', 'mile', 'mili', 'received', 'receive', 'credited', 'credit', 'got', 'earned', 'kamaya', 'kamaye'];
// Words that clearly mean money went out. "diya/diye" are left out on purpose:
// "client ne 20000 diye" is income, "dost ko 500 diye" falls back to expense anyway.
const EXPENSE_WORDS = ['spent', 'spend', 'kharch', 'kharcha', 'kharche', 'kharchi', 'paid', 'pay', 'bhara', 'bhare', 'gaya', 'gaye', 'gayi', 'debited', 'debit'];

const MERCHANTS: Record<string, string> = {
  swiggy: 'Swiggy', zomato: 'Zomato', amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', meesho: 'Meesho',
  uber: 'Uber', ola: 'Ola', rapido: 'Rapido', blinkit: 'Blinkit', zepto: 'Zepto', bigbasket: 'BigBasket',
  instamart: 'Instamart', dmart: 'DMart', netflix: 'Netflix', hotstar: 'Hotstar', spotify: 'Spotify',
  jio: 'Jio', airtel: 'Airtel',
};

// Hinglish/English glue words dropped from the note.
const FILLER = new Set([
  'ka', 'ki', 'ke', 'ko', 'me', 'mein', 'mai', 'pe', 'par', 'se', 'ne', 'hai', 'hain', 'tha', 'thi', 'the', 'hua', 'hui', 'hue', 'kiya', 'kiye', 'ki',
  'mera', 'meri', 'mere', 'maine', 'humne', 'apna', 'apni', 'for', 'on', 'of', 'a', 'an', 'to', 'in', 'at', 'is', 'was', 'i', 'my', 'and', 'aur',
  'rs', 'rupees', 'rupee', 'rupaye', 'rupay', 'rupiya', 'rupiye', 'inr', 'only', 'bas', 'total', 'wala', 'wali', 'wale', 'ye', 'yeh', 'vo', 'woh',
  'kuch', 'thoda', 'fir', 'phir', 'then', 'plus', 'add', 'karo', 'kar', 'do', 'expense', 'raat', 'subah', 'shaam',
  ...INCOME_WORDS, ...EXPENSE_WORDS,
]);

function wordsOf(text: string): string[] {
  return text.split(/[^a-z0-9&]+/).filter(Boolean);
}

function matchCategory(words: string[], rules: CategoryRule[]): string | null {
  for (const rule of rules) {
    if (rule.words.some(word => words.includes(word))) return rule.category;
  }
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------- splitting

const SEPARATOR_RE = /\s*(?:,|;|\band\b|\baur\b|\bplus\b|\bfir\b|\bphir\b|\bthen\b|\bor\b|&(?!\s*dining))\s*/;

/**
 * Splits a piece that holds several amounts with no "aur" between them:
 *   "500 petrol 250 lunch"  -> amount-first: cut before each amount
 *   "petrol 500 lunch 250"  -> word-first: cut after each amount
 */
function splitByAmounts(piece: string): string[] {
  const amounts = findAmounts(piece);
  if (amounts.length < 2) return [piece];
  const amountFirst = piece.slice(0, amounts[0].start).trim() === '';
  const cuts = amountFirst ? amounts.slice(1).map(item => item.start) : amounts.slice(0, -1).map(item => item.end);
  const parts: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    parts.push(piece.slice(from, cut));
    from = cut;
  }
  parts.push(piece.slice(from));
  return parts.map(part => part.trim()).filter(Boolean);
}

// ---------------------------------------------------------------- main

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/₹\s*/g, ' ')
    .replace(/(\d)\s*(?:rs\.?|\/-)/g, '$1 ')
    .replace(/\brs\.?\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePiece(piece: string, date: string): ParsedEntry | null {
  const amounts = findAmounts(piece);
  if (amounts.length === 0) return null;
  const amount = amounts[0];
  const amountPaise = Math.round(amount.value * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return null;

  const rest = `${piece.slice(0, amount.start)} ${piece.slice(amount.end)}`;
  const words = wordsOf(rest);
  const incomeCategory = matchCategory(words, INCOME_CATEGORIES);
  const saysIncome = words.some(word => INCOME_WORDS.includes(word));
  const saysExpense = words.some(word => EXPENSE_WORDS.includes(word));
  const expenseCategory = matchCategory(words, EXPENSE_CATEGORIES);
  let type: EntryType = 'expense';
  if (saysExpense) type = 'expense';
  // "salary se 500 petrol": the spending category wins unless money is said to come in.
  else if (expenseCategory && !saysIncome) type = 'expense';
  else if (incomeCategory || saysIncome) type = 'income';

  const category = type === 'income' ? incomeCategory ?? 'Other' : expenseCategory ?? 'Other';
  const merchantKey = words.find(word => MERCHANTS[word]);
  const merchant = merchantKey ? MERCHANTS[merchantKey] : null;
  const noteWords = words.filter(word => !FILLER.has(word) && !/^\d+$/.test(word) && word !== merchantKey);
  const noteText = noteWords.join(' ');
  // "1 lakh salary" -> no point repeating "Salary" as the note.
  const note = noteText && noteText !== category.toLowerCase() ? capitalize(noteText) : null;

  return { type, amountPaise, category, date, merchant, note, sourceText: piece.trim() };
}

export function parseSpokenEntries(input: string, today: string): ParseResult {
  const text = normalize(input);
  if (!text) return { entries: [], unparsed: [] };

  // Dates are pulled out before splitting on amounts so "15/11" or "3 din pehle"
  // are never mistaken for amounts. Sub-pieces share their piece's date.
  const dated = text
    .split(SEPARATOR_RE)
    .filter(piece => piece.trim())
    .flatMap(piece => {
      const { date, rest } = extractDate(piece, today);
      const cleaned = rest.replace(/\s+/g, ' ').trim();
      const parts = cleaned ? splitByAmounts(cleaned) : [''];
      return parts.map(part => ({ date, rest: part, original: parts.length > 1 ? part : piece }));
    });

  // One date phrase anywhere ("500 petrol aur 250 lunch kal") applies to everything.
  // With several, each piece keeps its own and later pieces inherit the last one said.
  const distinct = new Set(dated.map(item => item.date).filter(Boolean));
  const shared = distinct.size === 1 ? [...distinct][0] : null;

  const entries: ParsedEntry[] = [];
  const unparsed: string[] = [];
  let carried: string | null = null;
  for (const item of dated) {
    if (item.date) carried = item.date;
    const date = shared ?? item.date ?? carried ?? today;
    if (!item.rest) continue; // a bare date phrase, already applied
    const entry = parsePiece(item.rest, date);
    if (entry) {
      entries.push({ ...entry, sourceText: item.original.trim() });
    } else if (wordsOf(item.rest).some(word => !FILLER.has(word))) {
      unparsed.push(item.original.trim());
    }
  }
  return { entries, unparsed };
}
