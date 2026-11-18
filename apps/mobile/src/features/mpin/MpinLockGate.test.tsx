import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { MpinLockGate } from './MpinLockGate';
import { MpinStore } from './mpinStore';
jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
const mockStore: { current?: MpinStore } = {};
jest.mock('./getMpinStore', () => ({ getMpinStore: () => Promise.resolve(mockStore.current) }));
function fakeStore() {
  const rows = new Map<string, string>();
  const database = {
    execute: async (query: string, params: string[] = []) => {
      if (query.startsWith('SELECT')) {
        const value = rows.get(params[0]);
        return { rows: value === undefined ? [] : [{ value }], rowsAffected: 0 };
      }
      if (query.startsWith('INSERT')) rows.set(params[0], params[1]);
      else if (query.includes("LIKE 'mpin%'")) [...rows.keys()].forEach(k => rows.delete(k));
      else params.forEach(key => rows.delete(key));
      return { rows: [], rowsAffected: 1 };
    },
  };
  return new MpinStore(database as never);
}
const flush = () => ReactTestRenderer.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const texts = (r: ReactTestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map(n => String(n.props.children));
async function mount() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<MpinLockGate><Text>APP</Text></MpinLockGate>);
  });
  await flush();
  return renderer;
}
const type = async (r: ReactTestRenderer.ReactTestRenderer, value: string) => {
  for (const digit of value) {
    await ReactTestRenderer.act(async () =>
      r.root.find(n => n.props.accessibilityLabel === digit && typeof n.props.onPress === 'function').props.onPress(),
    );
  }
  await flush();
};
describe('MpinLockGate', () => {
  afterEach(() => jest.restoreAllMocks());
  it('keeps the keypad usable when the clock moves on between reads (real devices)', async () => {
    let clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => (clock += 7));
    mockStore.current = fakeStore();
    await mockStore.current.set('2580');
    const renderer = await mount();
    expect(texts(renderer).join(' ')).not.toContain('second baad');
    const keys = renderer.root.findAll(n => n.props.accessibilityLabel === '1' && n.props.accessibilityRole === 'button');
    expect(keys.some(n => n.props.disabled === true)).toBe(false);
    await type(renderer, '2580');
    expect(texts(renderer)).toContain('APP');
  });
  it('opens straight away when no MPIN is set', async () => {
    mockStore.current = fakeStore();
    expect(texts(await mount())).toContain('APP');
  });
  it('shows the MPIN screen, rejects a wrong MPIN and opens on the right one', async () => {
    mockStore.current = fakeStore();
    await mockStore.current.set('2580');
    const renderer = await mount();
    expect(texts(renderer)).toContain('MPIN daalo');
    await type(renderer, '1111');
    expect(texts(renderer).join(' ')).toContain('Galat MPIN. 4 koshish bachi hain.');
    await type(renderer, '2580');
    expect(texts(renderer)).toContain('APP');
  });
  it('the delete key removes the last digit', async () => {
    mockStore.current = fakeStore();
    await mockStore.current.set('2580');
    const renderer = await mount();
    await type(renderer, '258');
    await ReactTestRenderer.act(async () =>
      renderer.root.find(n => n.props.accessibilityLabel === 'Delete digit' && typeof n.props.onPress === 'function').props.onPress(),
    );
    await type(renderer, '80');
    expect(texts(renderer)).toContain('APP');
  });
  it('"MPIN bhool gaye?" removes the MPIN and opens the app', async () => {
    mockStore.current = fakeStore();
    await mockStore.current.set('2580');
    const renderer = await mount();
    await ReactTestRenderer.act(async () => renderer.root.find(n => n.props.accessibilityLabel === 'Forgot MPIN' && !!n.props.onPress).props.onPress());
    await flush();
    expect(texts(renderer)).toContain('APP');
    expect(await mockStore.current.isSet()).toBe(false);
  });
});
