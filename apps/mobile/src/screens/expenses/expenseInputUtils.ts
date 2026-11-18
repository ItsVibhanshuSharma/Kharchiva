import { formatShortDate } from '../../utils/dates';

export function parseRupeesToPaise(value: string): number | null {
  const normalized = value.trim().replace(/[₹,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [rupees, paise = ''] = normalized.split('.');
  const amount = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function dateForExpenseInput(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function expenseDateToIso(value: string, now: Date): string | null {
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) => timeParts.find(item => item.type === type)?.value ?? '00';
    const indiaTime = `${get('hour')}:${get('minute')}:${get('second')}`;
    const iso = new Date(`${normalized}T${indiaTime}+05:30`);
    return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Move a YYYY-MM-DD calendar date by whole days. Returns null for invalid input. */
export function shiftDateInput(value: string, days: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCMonth() !== Number(match[2]) - 1) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Human label for a YYYY-MM-DD date relative to today (India time). */
export function describeDateInput(value: string, now: Date): string {
  const today = dateForExpenseInput(now);
  if (value === today) return 'Today';
  if (value === shiftDateInput(today, -1)) return 'Yesterday';
  return formatShortDate(value);
}
