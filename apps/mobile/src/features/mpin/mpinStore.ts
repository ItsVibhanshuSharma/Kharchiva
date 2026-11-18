import type { DatabaseAdapter } from '../../database/types';
import { sha256 } from './sha256';
export const MPIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 30_000;
const HASH_ROUNDS = 5000;
const KEY_MPIN = 'mpin';
const KEY_ATTEMPTS = 'mpin_failed_attempts';
const KEY_LOCKED_UNTIL = 'mpin_locked_until';
export type VerifyResult =
  | { ok: true }
  | { ok: false; attemptsLeft: number; lockedUntil: number | null };
export const isValidMpin = (pin: string) => new RegExp(`^\\d{${MPIN_LENGTH}}$`).test(pin);
/** Salted, iterated hash so the MPIN itself is never written to disk. */
export function hashMpin(pin: string, salt: string): string {
  let digest = sha256(`${salt}:${pin}`);
  for (let i = 0; i < HASH_ROUNDS; i += 1) digest = sha256(`${digest}${salt}${pin}`);
  return digest;
}
const randomSalt = () =>
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')).join('');
/** Keeps the MPIN hash and the wrong-attempt lockout in the local `app_settings` table. */
export class MpinStore {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly now: () => number = Date.now,
    private readonly makeSalt: () => string = randomSalt,
  ) {}
  private async read(key: string): Promise<string | null> {
    const result = await this.database.execute('SELECT value FROM app_settings WHERE key = ?;', [key]);
    const value = result.rows?.[0]?.value;
    return typeof value === 'string' ? value : null;
  }
  private async write(key: string, value: string): Promise<void> {
    await this.database.execute('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [key, value]);
  }
  async isSet(): Promise<boolean> {
    return (await this.read(KEY_MPIN)) !== null;
  }
  /** Milliseconds until another attempt is allowed; 0 when not locked. */
  async lockRemainingMs(): Promise<number> {
    const lockedUntil = Number(await this.read(KEY_LOCKED_UNTIL));
    return Number.isFinite(lockedUntil) ? Math.max(0, lockedUntil - this.now()) : 0;
  }
  async set(pin: string): Promise<void> {
    if (!isValidMpin(pin)) throw new Error(`MPIN must be ${MPIN_LENGTH} digits.`);
    const salt = this.makeSalt();
    await this.write(KEY_MPIN, `${salt}:${hashMpin(pin, salt)}`);
    await this.clearAttempts();
  }
  async remove(): Promise<void> {
    await this.database.execute("DELETE FROM app_settings WHERE key LIKE 'mpin%';");
  }
  async verify(pin: string): Promise<VerifyResult> {
    const remaining = await this.lockRemainingMs();
    if (remaining > 0) return { ok: false, attemptsLeft: 0, lockedUntil: this.now() + remaining };
    const stored = await this.read(KEY_MPIN);
    if (stored === null) return { ok: true };
    const [salt, hash] = stored.split(':');
    if (isValidMpin(pin) && hashMpin(pin, salt) === hash) {
      await this.clearAttempts();
      return { ok: true };
    }
    const failed = (Number(await this.read(KEY_ATTEMPTS)) || 0) + 1;
    if (failed >= MAX_ATTEMPTS) {
      const lockedUntil = this.now() + LOCK_MS;
      await this.write(KEY_ATTEMPTS, '0');
      await this.write(KEY_LOCKED_UNTIL, String(lockedUntil));
      return { ok: false, attemptsLeft: 0, lockedUntil };
    }
    await this.write(KEY_ATTEMPTS, String(failed));
    return { ok: false, attemptsLeft: MAX_ATTEMPTS - failed, lockedUntil: null };
  }
  private async clearAttempts(): Promise<void> {
    await this.database.execute("DELETE FROM app_settings WHERE key IN (?, ?);", [KEY_ATTEMPTS, KEY_LOCKED_UNTIL]);
  }
}
