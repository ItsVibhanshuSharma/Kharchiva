import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseSchema } from './expense.schema';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const expenseId = '507f1f77bcf86cd799439012';
  const date = new Date('2026-10-13T10:00:00.000Z');
  const saved = { _id: new Types.ObjectId(expenseId), expenseDate: date, amountPaise: 12345 };
  const model = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpensesService(model as never);
  });

  const createDto = {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    amountPaise: 12345,
    currency: 'INR',
    categoryId: '507f1f77bcf86cd799439013',
    expenseDate: date.toISOString(),
    type: 'PERSONAL',
    source: 'MANUAL',
  } as CreateExpenseDto;

  it('creates paise-based expenses scoped to the authenticated owner', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    model.create.mockResolvedValue(saved);
    await expect(service.create(userId, createDto)).resolves.toEqual({ expense: saved, created: true });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: expect.any(Types.ObjectId),
      amountPaise: 12345,
      expenseDate: date,
      version: 1,
    }));
  });

  it('returns a prior idempotent create for the same owner and client id', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(saved) });
    await expect(service.create(userId, createDto)).resolves.toEqual({ expense: saved, created: false });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('scopes reads to owner and hides other users records as not found', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    model.findOne.mockReturnValue({ exec });
    await expect(service.get(userId, expenseId)).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(expenseId),
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
  });

  it('declares stored reference identifiers as BSON ObjectIds', () => {
    expect(ExpenseSchema.path('userId')?.instance).toBe('ObjectId');
    expect(ExpenseSchema.path('categoryId')?.instance).toBe('ObjectId');
    expect(ExpenseSchema.path('paymentSourceId')?.instance).toBe('ObjectId');
  });

  it('lets the authenticated owner read the expense created for that owner', async () => {
    const ownerExpense = { ...saved, userId: new Types.ObjectId(userId), deletedAt: null };
    const findOne = jest.fn()
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(ownerExpense) });
    model.findOne.mockImplementation(findOne);
    model.create.mockResolvedValue(ownerExpense as never);

    const created = await service.create(userId, createDto);
    await expect(service.get(userId, created.expense._id.toString())).resolves.toBe(ownerExpense);
    expect(findOne).toHaveBeenLastCalledWith({
      _id: ownerExpense._id,
      userId: ownerExpense.userId,
      deletedAt: null,
    });
  });

  it('does not return an expense to a different authenticated user', async () => {
    const otherUserId = '507f1f77bcf86cd799439099';
    const exec = jest.fn().mockResolvedValue(null);
    model.findOne.mockReturnValue({ exec });
    await expect(service.get(otherUserId, expenseId)).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(expenseId),
      userId: new Types.ObjectId(otherUserId),
      deletedAt: null,
    });
  });

  it('does not return a soft-deleted expense as active', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    model.findOne.mockReturnValue({ exec });
    await expect(service.get(userId, expenseId)).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOne).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
  });

  it('applies owner filter and stable cursor ordering when listing', async () => {
    const query = {
      sort: 'desc', limit: 20,
      sortMock: undefined,
    } as never;
    const exec = jest.fn().mockResolvedValue([saved]);
    const limit = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ limit });
    model.find.mockReturnValue({ sort });
    const result = await service.list(userId, query);
    expect(model.find).toHaveBeenCalledWith({ userId: expect.any(Types.ObjectId), deletedAt: null });
    expect(sort).toHaveBeenCalledWith({ expenseDate: -1, _id: -1 });
    expect(result.pagination).toEqual({ nextCursor: null, hasMore: false });
  });

  it('updates owner-scoped expenses and increments the version', async () => {
    const exec = jest.fn().mockResolvedValue(saved);
    model.findOneAndUpdate.mockReturnValue({ exec });
    await service.update(userId, expenseId, { amountPaise: 20000 });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(expenseId), userId: new Types.ObjectId(userId), deletedAt: null },
      { $set: { amountPaise: 20000 }, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
  });

  it('soft deletes owner-scoped expenses', async () => {
    const exec = jest.fn().mockResolvedValue(saved);
    model.findOneAndUpdate.mockReturnValue({ exec });
    await expect(service.delete(userId, expenseId)).resolves.toEqual({ deleted: true });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(expenseId), userId: new Types.ObjectId(userId), deletedAt: null },
      { $set: { deletedAt: expect.any(Date) }, $inc: { version: 1 } },
      { new: true },
    );
  });
});
