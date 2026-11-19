import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { GroupsHomeCard } from '../../features/groups/GroupsHomeCard';
import { createLocalGroupsApi, type PersistedStore } from '../../features/groups/localGroupsApi';
import type { GroupsApi } from '../../features/groups/types';
import { AddGroupExpenseScreen } from './AddGroupExpenseScreen';
import { CreateGroupScreen } from './CreateGroupScreen';
import { GroupDetailScreen } from './GroupDetailScreen';
import { GroupsScreen } from './GroupsScreen';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('react-native-share', () => ({ __esModule: true, default: { open: jest.fn() } }));
jest.mock('react-native-html-to-pdf', () => ({ generatePDF: jest.fn() }));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  return {
    useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack, reset: jest.fn(), canGoBack: () => true }),
    useRoute: () => ({ params: mockParams }),
    useFocusEffect: (callback: () => void) => ReactRuntime.useEffect(callback, [callback]),
  };
});
jest.mock('../../components/snackbar', () => ({ showSnackbar: jest.fn() }));

let mockApi: GroupsApi;
jest.mock('../../features/groups/groupsApi', () => ({
  ...jest.requireActual('../../features/groups/groupsApi'),
  getGroupsApi: () => mockApi,
}));

function freshApi() {
  let saved: string | null = null;
  const store: PersistedStore = {
    load: async () => saved,
    save: async value => {
      saved = value;
    },
  };
  return createLocalGroupsApi({ store, me: () => ({ displayName: 'Asha', phoneNumber: '+919876543210' }) });
}

const flush = async () => {
  await ReactTestRenderer.act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
};

async function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
  });
  await flush();
  return renderer!;
}

const textOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(renderer.toJSON());

async function press(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  const target = renderer.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
  await flush();
}

async function type(renderer: ReactTestRenderer.ReactTestRenderer, placeholder: string, value: string) {
  const input = renderer.root.find(node => node.props.placeholder === placeholder && typeof node.props.onChangeText === 'function');
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText(value);
  });
}

describe('Splitwise groups screens', () => {
  beforeEach(() => {
    mockApi = freshApi();
    mockParams = {};
    jest.clearAllMocks();
  });

  it('hides the Home card until the user is in a group', async () => {
    let renderer = await render(<GroupsHomeCard onOpen={jest.fn()} />);
    expect(renderer.toJSON()).toBeNull();

    await mockApi.create({ title: 'Goa Trip' });
    renderer = await render(<GroupsHomeCard onOpen={jest.fn()} />);
    expect(textOf(renderer)).toContain('Splitwise · 1 group');
  });

  it('removes the Home card once the only group is completed', async () => {
    const group = await mockApi.create({ title: 'Goa Trip' });
    await mockApi.update(group.id, { status: 'CLOSED' });
    const renderer = await render(<GroupsHomeCard onOpen={jest.fn()} />);
    expect(renderer.toJSON()).toBeNull();
  });

  it('lists completed groups under their own heading', async () => {
    const group = await mockApi.create({ title: 'Goa Trip' });
    await mockApi.update(group.id, { status: 'CLOSED' });
    const renderer = await render(<GroupsScreen />);
    expect(textOf(renderer)).toContain('Completed');
    expect(textOf(renderer)).toContain('Goa Trip');
  });

  it('shows an empty state on the groups screen', async () => {
    const renderer = await render(<GroupsScreen />);
    expect(textOf(renderer)).toContain('No groups yet');
  });

  it('creates a group with a friend added by phone', async () => {
    const renderer = await render(<CreateGroupScreen />);
    await type(renderer, 'e.g. Goa Trip', 'Goa Trip');
    await press(renderer, 'Add a person');
    await type(renderer, 'Name', 'Ravi');
    await type(renderer, 'Mobile number', '98000 00001');
    await press(renderer, 'Create group');

    const { items } = await mockApi.list();
    expect(items).toHaveLength(1);
    const detail = await mockApi.detail(items[0].id);
    expect(detail.members.map(member => member.displayName)).toEqual(['Asha', 'Ravi']);
    expect(detail.members[1].phoneNumber).toBe('+919800000001');
    expect(mockReplace).toHaveBeenCalledWith('GroupDetail', { groupId: items[0].id, justCreated: true });
  });

  it('asks for a name before creating', async () => {
    const renderer = await render(<CreateGroupScreen />);
    await press(renderer, 'Create group');
    expect(textOf(renderer)).toContain('Give the group a name');
    expect((await mockApi.list()).items).toHaveLength(0);
  });

  it('saves an equal-split expense and updates the balance', async () => {
    const group = await mockApi.create({ title: 'Flat', members: [{ displayName: 'Ravi', phoneNumber: '+919800000001' }] });
    mockParams = { groupId: group.id };
    const renderer = await render(<AddGroupExpenseScreen />);
    await type(renderer, 'e.g. Hotel, Dinner, Cab', 'Rent');
    await type(renderer, '0', '1000');
    await press(renderer, 'Save expense');

    const detail = await mockApi.detail(group.id);
    expect(detail.members.find(member => member.displayName === 'Asha')!.balancePaise).toBe(50000);
    expect(detail.members.find(member => member.displayName === 'Ravi')!.balancePaise).toBe(-50000);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not save when the exact amounts do not add up', async () => {
    const group = await mockApi.create({ title: 'Flat', members: [{ displayName: 'Ravi', phoneNumber: '+919800000001' }] });
    mockParams = { groupId: group.id };
    const renderer = await render(<AddGroupExpenseScreen />);
    await type(renderer, 'e.g. Hotel, Dinner, Cab', 'Rent');
    await type(renderer, '0', '1000');
    await press(renderer, 'Exact amounts');
    await press(renderer, 'Save expense');
    expect(textOf(renderer)).toContain('do not add up');
    expect(await mockApi.listExpenses(group.id)).toHaveLength(0);
  });

  it('completes a settled group from the bottom button, then offers to download or share the PDF', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const group = await mockApi.create({ title: 'Goa Trip' });
    mockParams = { groupId: group.id };
    const renderer = await render(<GroupDetailScreen />);
    // The top row only has Add expense and Invite now.
    expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Complete')).toHaveLength(0);
    expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'PDF')).toHaveLength(0);
    await press(renderer, 'Mark group as complete');

    expect((await mockApi.detail(group.id)).status).toBe('CLOSED');
    expect((await mockApi.list()).summary.groupCount).toBe(0);
    const [title, , buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Group complete');
    expect((buttons ?? []).map(button => button.text)).toEqual(['Download PDF', 'Share PDF', 'Not now']);
    expect(textOf(renderer)).toContain('Reopen group');
    alertSpy.mockRestore();
  });
});
