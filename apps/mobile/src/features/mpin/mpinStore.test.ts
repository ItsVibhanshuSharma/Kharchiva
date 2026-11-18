import type { DatabaseAdapter } from '../../database/types';
import { LOCK_MS, MAX_ATTEMPTS, MpinStore } from './mpinStore';
/** Tiny key-value stand-in for the app_settings table. */
function fakeDatabase() {
  const rows = new Map<string, string>();
  const database = {
    execute: async (query: string, params: string[] = []) => {
      if (query.startsWith('SELECT')) {
        const value = rows.get(params[0]);
        return { rows: value === undefined ? [] : [{ value }], rowsAffected: 0 };
      }
      if (query.startsWith('INSERT')) rows.set(params[0], params[1]);
      else if (query.includes("LIKE 'mpin%'")) [...rows.keys()].filter(k => k.startsWith('mpin')).forEach(k => rows.delete(k));
      else params.forEach(key => rows.delete(key));
      return { rows: [], rowsAffected: 1 };
    },
  };
  return { database: database as unknown as DatabaseAdapter, rows };
}
describe('MpinStore', () => {
  let clock = 1_000_000;
  const setup = () => {
    const { database, rows } = fakeDatabase();
    return { store: new MpinStore(database, () => clock, () => 'salt'), rows };
  };
  it('starts unset, then verifies the saved MPIN without storing it in plain text', async () => {
    const { store, rows } = setup();
    expect(await store.isSet()).toBe(false);
    await store.set('2580');
    expect(await store.isSet()).toBe(true);
    expect([...rows.values()].join(' ')).not.toContain('2580');
    expect(await store.verify('2580')).toEqual({ ok: true });
  });
  it('rejects a wrong MPIN and counts down attempts', async () => {
    const { store } = setup();
    await store.set('2580');
    expect(await store.verify('0000')).toEqual({ ok: false, attemptsLeft: MAX_ATTEMPTS - 1, lockedUntil: null });
  });
  it('locks after too many wrong attempts, even for the right MPIN, then unlocks', async () => {
    const { store } = setup();
    await store.set('2580');
    let result;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) result = await store.verify('0000');
    expect(result).toEqual({ ok: false, attemptsLeft: 0, lockedUntil: clock + LOCK_MS });
    expect((await store.verify('2580')).ok).toBe(false);
    clock += LOCK_MS + 1;
    expect(await store.verify('2580')).toEqual({ ok: true });
  });
  it('a correct MPIN resets the wrong-attempt count', async () => {
    const { store } = setup();
    await store.set('2580');
    await store.verify('0000');
    await store.verify('2580');
    expect(await store.verify('0000')).toMatchObject({ attemptsLeft: MAX_ATTEMPTS - 1 });
  });
  it('changes and removes the MPIN, and refuses invalid ones', async () => {
    const { store } = setup();
    await expect(store.set('12')).rejects.toThrow();
    await store.set('2580');
    await store.set('1357');
    expect((await store.verify('2580')).ok).toBe(false);
    expect((await store.verify('1357')).ok).toBe(true);
    await store.remove();
    expect(await store.isSet()).toBe(false);
  });
});
