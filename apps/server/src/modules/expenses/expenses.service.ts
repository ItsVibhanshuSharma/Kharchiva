import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './expense.schema';

interface ExpenseCursor {
  expenseDate: string;
  id: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenses: Model<Expense>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Keep the unique (userId, clientId) idempotency key active even when
    // Mongoose automatic index creation is disabled in production.
    await this.expenses.createIndexes();
  }

  async create(userId: string, dto: CreateExpenseDto) {
    const ownerId = new Types.ObjectId(userId);
    const prior = await this.expenses.findOne({ userId: ownerId, clientId: dto.clientId }).exec();
    if (prior) return { expense: prior, created: false };

    try {
      const expense = await this.expenses.create({
        ...dto,
        userId: ownerId,
        expenseDate: new Date(dto.expenseDate),
        version: 1,
        deletedAt: null,
      });
      return { expense, created: true };
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await this.expenses
          .findOne({ userId: ownerId, clientId: dto.clientId })
          .exec();
        if (duplicate) return { expense: duplicate, created: false };
      }
      throw error;
    }
  }

  async list(userId: string, query: ListExpensesDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from must be before or equal to to');
    }
    if (
      query.minAmountPaise !== undefined &&
      query.maxAmountPaise !== undefined &&
      query.minAmountPaise > query.maxAmountPaise
    ) {
      throw new BadRequestException('minAmountPaise must not exceed maxAmountPaise');
    }
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    };
    if (query.from || query.to) {
      const expenseDate: Record<string, Date> = {};
      if (query.from) expenseDate.$gte = new Date(query.from);
      if (query.to) expenseDate.$lte = new Date(query.to);
      filter.expenseDate = expenseDate;
    }
    if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
    if (query.paymentSourceId) filter.paymentSourceId = new Types.ObjectId(query.paymentSourceId);
    if (query.type) filter.type = query.type;
    if (query.source) filter.source = query.source;
    if (query.merchant) filter.merchant = { $regex: escapeRegex(query.merchant), $options: 'i' };
    if (query.minAmountPaise !== undefined || query.maxAmountPaise !== undefined) {
      const amount: Record<string, number> = {};
      if (query.minAmountPaise !== undefined) amount.$gte = query.minAmountPaise;
      if (query.maxAmountPaise !== undefined) amount.$lte = query.maxAmountPaise;
      filter.amountPaise = amount;
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      const date = new Date(cursor.expenseDate);
      if (!Number.isFinite(date.getTime()) || !Types.ObjectId.isValid(cursor.id)) {
        throw new BadRequestException('Invalid cursor');
      }
      const operator = query.sort === 'asc' ? '$gt' : '$lt';
      const tieOperator = query.sort === 'asc' ? '$gt' : '$lt';
      const dateOperator: Record<string, unknown> = { [operator]: date };
      const tieOperatorObj: Record<string, unknown> = {
        $and: [{ expenseDate: date }, { _id: { [tieOperator]: new Types.ObjectId(cursor.id) } }],
      };
      filter.$or = [{ expenseDate: dateOperator }, tieOperatorObj];
    }

    const direction = query.sort === 'asc' ? 1 : -1;
    const documents = await this.expenses
      .find(filter)
      .sort({ expenseDate: direction, _id: direction })
      .limit(query.limit + 1)
      .exec();
    const hasMore = documents.length > query.limit;
    const items: ExpenseDocument[] = documents.slice(0, query.limit) as ExpenseDocument[];
    const last = items.at(-1);
    return {
      items,
      pagination: {
        nextCursor: hasMore && last
          ? encodeCursor({ expenseDate: last.expenseDate.toISOString(), id: last._id.toString() })
          : null,
        hasMore,
      },
    };
  }

  async get(userId: string, expenseId: string) {
    assertObjectId(expenseId);
    const expense = await this.expenses
      .findOne({
        _id: new Types.ObjectId(expenseId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(userId: string, expenseId: string, dto: UpdateExpenseDto) {
    assertObjectId(expenseId);
    if (dto.amountPaise !== undefined && !Number.isSafeInteger(dto.amountPaise)) {
      throw new BadRequestException('amountPaise must be a safe integer');
    }
    const expense = await this.expenses
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(expenseId),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        {
          $set: {
            ...dto,
            ...(dto.expenseDate ? { expenseDate: new Date(dto.expenseDate) } : {}),
          },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async delete(userId: string, expenseId: string) {
    assertObjectId(expenseId);
    const expense = await this.expenses
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(expenseId),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
    if (!expense) throw new NotFoundException('Expense not found');
    return { deleted: true };
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function encodeCursor(cursor: ExpenseCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(cursor: string): ExpenseCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as ExpenseCursor;
    if (typeof parsed.expenseDate !== 'string' || typeof parsed.id !== 'string') throw new Error();
    return parsed;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

function assertObjectId(id: string): void {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid expenseId');
}
