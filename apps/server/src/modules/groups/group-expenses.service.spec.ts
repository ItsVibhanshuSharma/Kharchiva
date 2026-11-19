import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GroupExpensesService } from './group-expenses.service';
import { SplitType } from './split.util';

const oid = () => new Types.ObjectId();
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

describe('GroupExpensesService rules', () => {
  const groupId = oid();
  const alice = { _id: oid(), role: 'MEMBER' as const };
  const bob = { _id: oid(), role: 'MEMBER' as const };
  const admin = { _id: oid(), role: 'ADMIN' as const };

  const expenses = { findOne: jest.fn<any>(), create: jest.fn<any>() };
  const settlements = { findOne: jest.fn<any>(), create: jest.fn<any>() };
  const groups = {
    requireAccess: jest.fn<any>(),
    requireUsableMembers: jest.fn<any>(),
    recordActivity: jest.fn<any>(),
  };
  let service: GroupExpensesService;

  const body = (overrides: Record<string, unknown> = {}) => ({
    title: 'Dinner',
    amountPaise: 3000,
    expenseDate: '2026-05-01T10:00:00.000Z',
    payers: [{ memberId: alice._id.toString(), amountPaise: 3000 }],
    splitType: SplitType.EQUAL,
    splits: [{ memberId: alice._id.toString() }, { memberId: bob._id.toString() }],
    ...overrides,
  });

  const storedExpense = (createdBy: Types.ObjectId) => {
    const doc: any = {
      _id: oid(),
      clientId: 'c',
      title: 'Dinner',
      amountPaise: 3000,
      expenseDate: new Date('2026-05-01T10:00:00.000Z'),
      payers: [{ memberId: alice._id, amountPaise: 3000 }],
      splitType: SplitType.EQUAL,
      splits: [
        { memberId: alice._id, amountPaise: 1500 },
        { memberId: bob._id, amountPaise: 1500 },
      ],
      createdByMemberId: createdBy,
      version: 1,
      deletedAt: null,
    };
    doc.set = jest.fn((parts: Record<string, unknown>) => Object.assign(doc, parts));
    doc.save = jest.fn(async () => doc);
    return doc;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    groups.requireUsableMembers.mockResolvedValue(undefined);
    service = new GroupExpensesService(expenses as never, settlements as never, {} as never, groups as never);
  });

  it('refuses new expenses in a closed group', async () => {
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'CLOSED' }, member: alice });
    await expect(service.create('u', groupId.toString(), { clientId: 'x', ...body() } as never)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects payments that do not add up to the total', async () => {
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: alice });
    expenses.findOne.mockReturnValue(exec(null));
    const bad = body({ payers: [{ memberId: alice._id.toString(), amountPaise: 1000 }] });
    await expect(service.create('u', groupId.toString(), { clientId: 'x', ...bad } as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('stores computed shares and logs the creation', async () => {
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: alice });
    expenses.findOne.mockReturnValue(exec(null));
    expenses.create.mockImplementation(async (doc: any) => ({ ...storedExpense(alice._id), ...doc, _id: oid() }));
    await service.create('u', groupId.toString(), { clientId: 'x', ...body() } as never);
    const saved = expenses.create.mock.calls[0][0] as any;
    expect(saved.splits.map((s: any) => s.amountPaise)).toEqual([1500, 1500]);
    expect(groups.recordActivity).toHaveBeenCalledWith(groupId, alice._id, 'EXPENSE_ADDED', expect.anything(), {
      title: 'Dinner',
      amountPaise: 3000,
    });
  });

  it('lets only the creator or an admin edit an expense', async () => {
    expenses.findOne.mockReturnValue(exec(storedExpense(alice._id)));
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: bob });
    await expect(
      service.update('u', groupId.toString(), oid().toString(), body() as never),
    ).rejects.toThrow(ForbiddenException);

    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: admin });
    await expect(
      service.update('u', groupId.toString(), oid().toString(), body({ title: 'Lunch' }) as never),
    ).resolves.toMatchObject({ title: 'Lunch', version: 2 });
  });

  it('records what changed when an expense is edited', async () => {
    expenses.findOne.mockReturnValue(exec(storedExpense(alice._id)));
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: alice });
    await service.update('u', groupId.toString(), oid().toString(), body({ title: 'Lunch' }) as never);
    const details = groups.recordActivity.mock.calls[0][4] as any;
    expect(Object.keys(details.changes)).toEqual(['title']);
    expect(details.changes.title).toEqual({ from: 'Dinner', to: 'Lunch' });
  });

  it('blocks deleting someone else\'s expense for a normal member', async () => {
    expenses.findOne.mockReturnValue(exec(storedExpense(alice._id)));
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: bob });
    await expect(service.delete('u', groupId.toString(), oid().toString())).rejects.toThrow(ForbiddenException);
  });

  it('rejects a settlement from a person to themselves', async () => {
    groups.requireAccess.mockResolvedValue({ group: { _id: groupId, status: 'ACTIVE' }, member: alice });
    const id = alice._id.toString();
    await expect(
      service.createSettlement('u', groupId.toString(), { clientId: 'x', fromMemberId: id, toMemberId: id, amountPaise: 5 }),
    ).rejects.toThrow(BadRequestException);
  });
});
