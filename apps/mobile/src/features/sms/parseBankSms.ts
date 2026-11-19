/**
 * Turns a bank / UPI / card SMS into an income or expense draft.
 *
 *   "Rs 500.00 debited from A/c XX1234 on 12-05-25 to VPA swiggy@okaxis (UPI Ref 1234)"
 *     -> expense ₹500, merchant "swiggy", Food & Dining
 *
 * Rule-based and fully on-device. Returns null for anything that is not clearly a
 * completed transaction (OTPs, offers, failed payments, balance alerts, due reminders).
 * The result is only ever a draft: the user confirms it before it reaches the ledger.
 */
export type SmsMessage = {
  /** Stable id supplied by the native receiver. */
  id: string;
  sender: string;
  body: string;
  /** Epoch milliseconds when the SMS was received. */
  receivedAt: number;
};

export type SmsDraft = {
  id: string;
  type: 'expense' | 'income';
  amountPaise: number;
  category: string;
  merchant: string | null;
  /** e.g. "UPI ··1234". */
  paymentSource: string | null;
  note: string;
  occurredAt: string;
};

const SKIP_RE =
  /\botp\b|one[\s-]?time password|do not share|\bcvv\b|\bpin\b|pre-?approved|\boffer\b|apply now|\bwill be (?:debited|credited)\b|\bis due\b|\bdue (?:on|by|date)\b|\bminimum (?:amount )?due\b|\bunsuccessful\b|\bfailed\b|\bdeclined\b|\bnot (?:been )?(?:processed|completed)\b|\brequested?\b|\bmandate\b|\bbalance (?:is|as on)\b/i;

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
// Some banks (e.g. SBI UPI) write "debited by 250.0" with no Rs/INR. Only trust a bare
// number when it directly follows the transaction verb, and never when it looks like a
// date ("18-11-26") or runs into more digits.
const VERB_AMOUNT_RE =
  /\b(?:debited|credited|deducted|withdrawn|paid|sent|spent|received|deposited)\s+(?:by|with|for|of)\s+(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d{1,2})?)(?![\d/-])/i;
// Banks add links like "Not you? report at https://…". A link only disqualifies a message
// that never names an account, card or UPI, which is what promos and phishing look like.
const LINK_RE = /https?:\/\/|www\.|\bclick\b/i;
const ACCOUNT_REF_RE = /\ba\/c|\bacc(?:oun)?t\b|\bacct\b|\bcard\b|\bupi\b|\bvpa\b|\b[xX*]+\d{3,}/i;
const BALANCE_BEFORE_RE = /(?:bal(?:ance)?|avl|available|limit|outstanding|total)[^\d₹]{0,15}$/i;
// Bank of Baroda and others abbreviate: "Rs.508.00 Dr. from A/C XX1819 and Cr. to x@ybl".
// Only trust "Dr"/"Cr" right before from/to, so names like "Dr. Batra" are not read as debits.
const DEBIT_RE = /\b(?:debited|spent|paid|withdrawn|purchase|sent|deducted|payment of)\b|\bdr\b\.?(?=\s+(?:from|to)\b)/i;
const CREDIT_RE = /\b(?:credited|received|deposited|refund(?:ed)?|cashback)\b|\bcr\b\.?(?=\s+(?:from|to)\b)/i;

const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/swiggy|zomato|restaurant|cafe|dominos|pizza|mcdonald|kfc|starbucks|food/i, 'Food & Dining'],
  [/bigbasket|blinkit|zepto|dmart|grocer|instamart|jiomart/i, 'Groceries'],
  [/petrol|fuel|iocl|bpcl|hpcl|indianoil|shell/i, 'Fuel'],
  [/cigarette|tobacco|\bpaan\b|\bbeedi\b|\bbidi\b/i, 'Sutta'],
  [/uber|ola\b|rapido|irctc|redbus|makemytrip|metro|railway|fastag|indigo|airline/i, 'Travel'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa/i, 'Shopping'],
  [/electric|bescom|power|water|gas|broadband|airtel|jio|vodafone|vi\b|recharge|bill/i, 'Bills'],
  [/pharm|medic|hospital|clinic|apollo|1mg|netmeds/i, 'Health'],
  [/netflix|hotstar|spotify|prime video|bookmyshow|pvr|inox/i, 'Entertainment'],
  [/rent/i, 'Rent'],
];

function parseAmountPaise(text: string): number | null {
  for (const match of text.matchAll(AMOUNT_RE)) {
    const before = text.slice(Math.max(0, (match.index ?? 0) - 25), match.index ?? 0);
    if (BALANCE_BEFORE_RE.test(before)) continue;
    const rupees = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(rupees) || rupees <= 0) continue;
    return Math.round(rupees * 100);
  }
  const bare = text.match(VERB_AMOUNT_RE);
  if (bare) {
    const rupees = Number(bare[1].replace(/,/g, ''));
    if (Number.isFinite(rupees) && rupees > 0) return Math.round(rupees * 100);
  }
  return null;
}

function detectType(text: string): 'expense' | 'income' | null {
  // "credit card" is a payment instrument here, not a credit to the account.
  const cleaned = text.replace(/credit\s*card/gi, 'card');
  const debit = cleaned.search(DEBIT_RE);
  const credit = cleaned.search(CREDIT_RE);
  if (debit < 0 && credit < 0) return null;
  if (debit < 0) return 'income';
  if (credit < 0) return 'expense';
  // Both appear ("debited from A/c ... credited to merchant"): the first one describes this account.
  return debit < credit ? 'expense' : 'income';
}

function cleanName(raw: string | undefined): string | null {
  if (!raw) return null;
  let name = raw.trim().replace(/[.,;:\-\s]+$/g, '');
  // UPI handles: "swiggy@okaxis" -> "swiggy".
  name = name.replace(/^VPA\s+/i, '');
  // A UPI id that is just a phone number ("7723050096@axl") is a person; keep the whole id.
  if (/^\d{10}@[\w.]+$/.test(name)) return name;
  name = name.replace(/@[\w.]+$/, '');
  name = name.replace(/\s+/g, ' ');
  if (name.length < 2 || /^\d+$/.test(name) || /^[xX*]+\d*$/.test(name)) return null;
  if (/\ba\/c\b|\baccount\b/i.test(name)) return null;
  return name.slice(0, 40);
}

function detectMerchant(text: string, type: 'expense' | 'income'): string | null {
  const stop = String.raw`(?=\s+(?:on|via|using|ref(?:no)?|upi|utr|txn|from|dated|at|avl|bal|not|if)\b|\s*[(.,;]|\s*-\s|$)`;
  const patterns =
    type === 'expense'
      ? [new RegExp(String.raw`\bto\s+(?:VPA\s+)?([^\n]+?)${stop}`, 'i'), new RegExp(String.raw`\b(?:at|@)\s+([^\n]+?)${stop}`, 'i'), new RegExp(String.raw`\binfo[:\s-]+(?:UPI[/-])?([^\n/]+?)${stop}`, 'i')]
      : [new RegExp(String.raw`\b(?:by|from)\s+(?:VPA\s+)?([^\n]+?)${stop}`, 'i'), new RegExp(String.raw`\binfo[:\s-]+(?:UPI[/-])?([^\n/]+?)${stop}`, 'i')];
  for (const pattern of patterns) {
    const name = cleanName(text.match(pattern)?.[1]);
    if (name) return name;
  }
  return null;
}

function detectPaymentSource(text: string): string | null {
  const last4 = text.match(/(?:a\/c|acct?|account|card)\.?\s*(?:no\.?)?\s*(?:ending|ending with)?\s*(?:[xX*]+|\bno\b)?\s*(\d{4})\b/i)?.[1];
  const kind = /\bupi\b/i.test(text) ? 'UPI' : /\bcard\b/i.test(text) ? 'Card' : /\batm\b/i.test(text) ? 'ATM' : 'Bank';
  return last4 ? `${kind} ··${last4}` : kind;
}

function detectCategory(text: string, merchant: string | null, type: 'expense' | 'income'): string {
  if (type === 'income') {
    if (/salary/i.test(text)) return 'Salary';
    if (/interest/i.test(text)) return 'Interest';
    return 'Other';
  }
  const haystack = `${merchant ?? ''} ${text}`;
  for (const [pattern, category] of CATEGORY_HINTS) {
    if (pattern.test(haystack)) return category;
  }
  return 'Other';
}

export function parseBankSms(message: SmsMessage): SmsDraft | null {
  const body = message.body.replace(/\s+/g, ' ').trim();
  if (!body || SKIP_RE.test(body)) return null;
  if (LINK_RE.test(body) && !ACCOUNT_REF_RE.test(body)) return null;
  const amountPaise = parseAmountPaise(body);
  if (amountPaise === null) return null;
  const type = detectType(body);
  if (!type) return null;
  const merchant = detectMerchant(body, type);
  return {
    id: message.id,
    type,
    amountPaise,
    category: detectCategory(body, merchant, type),
    merchant,
    paymentSource: detectPaymentSource(body),
    note: 'Auto-detected from SMS',
    occurredAt: new Date(message.receivedAt).toISOString(),
  };
}
