import { parseBankSms } from './parseBankSms';

const at = new Date('2025-05-12T10:00:00Z').getTime();
const sms = (body: string) => parseBankSms({ id: 'x', sender: 'AX-HDFCBK', body, receivedAt: at });

describe('parseBankSms', () => {
  it('reads a UPI debit', () => {
    const draft = sms('Rs 500.00 debited from A/c XX1234 on 12-05-25 to VPA swiggy@okaxis (UPI Ref 1234567890). Not you? Call 1800');
    expect(draft).toMatchObject({ type: 'expense', amountPaise: 50000, merchant: 'swiggy', category: 'Food & Dining', paymentSource: 'UPI ··1234' });
    expect(draft?.occurredAt).toBe('2025-05-12T10:00:00.000Z');
  });

  it('reads a credit and ignores the balance amount', () => {
    const draft = sms('INR 1,25,000.00 credited to A/c XX9876 by ACME CORP SALARY. Avl Bal Rs 2,00,000.50');
    expect(draft).toMatchObject({ type: 'income', amountPaise: 12500000, category: 'Salary', paymentSource: 'Bank ··9876' });
  });

  it('treats a credit card spend as an expense', () => {
    const draft = sms('Rs.1,299.00 spent on Credit Card XX4321 at AMAZON on 12-05-25. Avl limit Rs 50,000');
    expect(draft).toMatchObject({ type: 'expense', amountPaise: 129900, merchant: 'AMAZON', category: 'Shopping' });
  });

  it('first keyword decides when both debit and credit appear', () => {
    expect(sms('Sent Rs.250.00 from HDFC Bank A/C *1234 to RAMESH on 12/05/25. Ref 55. Credited to RAMESH')?.type).toBe('expense');
  });

  it('reads an SBI UPI debit that has no Rs/INR, without swallowing "Refno"', () => {
    const draft = sms('Dear UPI user A/C X1234 debited by 250.0 on date 18Nov26 trf to SWIGGY Refno 112233445566. If not u? call 1800111109. -SBI');
    expect(draft).toMatchObject({ type: 'expense', amountPaise: 25000, merchant: 'SWIGGY', category: 'Food & Dining', paymentSource: 'UPI ··1234' });
  });

  it('reads Bank of Baroda "Dr."/"Cr." messages', () => {
    const shop = sms('Rs.508.00 Dr. from A/C XXXXXX1819 and Cr. to flipkart.hypg@yespay. Ref:584810465214. AvlBal:Rs43938.90(2026:11:16 11:54:00). Not you? Call 18005700/5000-BOB');
    expect(shop).toMatchObject({ type: 'expense', amountPaise: 50800, merchant: 'flipkart', category: 'Shopping', paymentSource: 'Bank ··1819' });
    const person = sms('Rs.1000.00 Dr. from A/C XXXXXX1819 and Cr. to 7723050096@axl. Ref:364223635054. AvlBal:Rs41786.90(2026:11:13 10:28:27). Not you? Call 18005700/5000-BOB');
    expect(person).toMatchObject({ type: 'expense', amountPaise: 100000, merchant: '7723050096@axl', paymentSource: 'Bank ··1819' });
    expect(sms('Rs.2000.00 Cr. to A/C XXXXXX1819 from RAMESH. Ref:1. AvlBal:Rs43938.90 -BOB')).toMatchObject({ type: 'income', amountPaise: 200000 });
    // "Dr." as a title is not a debit.
    expect(sms('Rs.500 appointment with Dr. Batra confirmed')).toBeNull();
  });
  it('reads an SBI UPI credit', () => {
    const draft = sms('Dear SBI UPI User, ur A/cX1234 credited by Rs500 on 18Nov26 by (Ref no 123456789)');
    expect(draft).toMatchObject({ type: 'income', amountPaise: 50000 });
  });

  it('keeps a real bank SMS that ends with a fraud-report link', () => {
    const draft = sms('Sent Rs.250.00 from Kotak Bank AC X1234 to swiggy@okaxis on 18-11-26.UPI Ref 123456. Not you, https://kotak.com/KBANKT/Fraud');
    expect(draft).toMatchObject({ type: 'expense', amountPaise: 25000, merchant: 'swiggy' });
  });

  it('never reads a date or reference as a bare amount', () => {
    expect(sms('Your A/c X1234 was debited for 18/11 charges')).toBeNull();
    expect(sms('A/C X1234 debited on 18-11-26. Call 1800')).toBeNull();
  });

  it.each([
    'Congrats! Rs 5000 credited to your wallet. Click http://bit.ly/abc to claim',
    'You have received Rs 2,000 reward, visit www.claim-now.in',
  ])('drops link messages that name no account, card or UPI: %s', body => {
    expect(sms(body)).toBeNull();
  });

  it.each([
    '123456 is your OTP for Rs 500 payment. Do not share.',
    'Rs 500 debit failed due to insufficient funds',
    'Your credit card bill of Rs 5,000 is due on 20-05-25',
    'Pre-approved loan of Rs 5,00,000. Apply now',
    'Your A/c balance is Rs 1,000',
    'Hello, lunch at 2?',
    'Rs 500 will be debited on 15-05 for mandate',
  ])('ignores non-transactions: %s', body => {
    expect(sms(body)).toBeNull();
  });
});
