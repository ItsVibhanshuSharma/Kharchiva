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
