import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateGroupExpenseDto,
  CreateSettlementDto,
  GroupExpenseBodyDto,
} from './dto/group-expense.dto';
import {
  GroupExpense,
  GroupExpenseDocument,
  GroupMember,
  GroupSettlement,
  GroupSettlementDocument,
} from './group.schemas';
import { GroupsService, isDuplicateKey, toObjectId } from './groups.service';
import { SplitError, computeShares, validatePayers } from './split.util';

const MAX_LIST = 1000;

@Injectable()
export class GroupExpensesService {
  constructor(
    @InjectModel(GroupExpense.name) private readonly expenses: Model<GroupExpense>,
    @InjectModel(GroupSettlement.name) private readonly settlements: Model<GroupSettlement>,
    @InjectModel(GroupMember.name) private readonly members: Model<GroupMember>,
    private readonly groups: GroupsService,
  ) {}

  // ---------- expenses ----------

  async create(userId: string, groupId: string, dto: CreateGroupExpenseDto) {
    const { group, member } = await this.groups.requireAccess(userId, groupId);
    if (group.status === 'CLOSED') throw new ConflictException('This group is closed');

    const prior = await this.expenses.findOne({ groupId: group._id, clientId: dto.clientId }).exec();
    if (prior) return this.present(prior);

    const parts = await this.buildParts(group._id, dto);
    try {
      const expense = await this.expenses.create({
        groupId: group._id,
        clientId: dto.clientId,
        ...parts,
        createdByMemberId: member._id,
        version: 1,
        deletedAt: null,
      });
      await this.groups.recordActivity(group._id, member._id, 'EXPENSE_ADDED', expense._id, {
        title: expense.title,
        amountPaise: expense.amountPaise,
      });
      return this.present(expense);
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await this.expenses.findOne({ groupId: group._id, clientId: dto.clientId }).exec();
        if (duplicate) return this.present(duplicate);
      }
      throw error;
    }
  }

  async list(userId: string, groupId: string) {
    const { group } = await this.groups.requireAccess(userId, groupId);
    const rows = await this.expenses
      .find({ groupId: group._id, deletedAt: null })
      .sort({ expenseDate: -1, _id: -1 })
      .limit(MAX_LIST)
      .exec();
    return { items: rows.map((row) => this.present(row)) };
  }

  async get(userId: string, groupId: string, expenseId: string) {
    const { group } = await this.groups.requireAccess(userId, groupId);
    return this.present(await this.findExpense(group._id, expenseId));
  }

  /** Edits replace the whole expense. Only the creator or an admin may edit. */
  async update(userId: string, groupId: string, expenseId: string, dto: GroupExpenseBodyDto) {
    const { group, member } = await this.groups.requireAccess(userId, groupId);
    if (group.status === 'CLOSED') throw new ConflictException('This group is closed');
    const expense = await this.findExpense(group._id, expenseId);
    this.assertCanChange(expense.createdByMemberId, member);

    const before = this.present(expense);
    const parts = await this.buildParts(group._id, dto);
    expense.set(parts);
    expense.version += 1;
    await expense.save();
    const after = this.present(expense);

    await this.groups.recordActivity(group._id, member._id, 'EXPENSE_EDITED', expense._id, {
      title: expense.title,
      changes: diff(before, after),
    });
    return after;
  }

  async delete(userId: string, groupId: string, expenseId: string) {
    const { group, member } = await this.groups.requireAccess(userId, groupId);
    if (group.status === 'CLOSED') throw new ConflictException('This group is closed');
    const expense = await this.findExpense(group._id, expenseId);
    this.assertCanChange(expense.createdByMemberId, member);
    expense.deletedAt = new Date();
    expense.version += 1;
    await expense.save();
    await this.groups.recordActivity(group._id, member._id, 'EXPENSE_DELETED', expense._id, {
      title: expense.title,
      amountPaise: expense.amountPaise,
    });
    return { deleted: true };
  }

  // ---------- settlements ----------

  async createSettlement(userId: string, groupId: string, dto: CreateSettlementDto) {
    const { group, member } = await this.groups.requireAccess(userId, groupId);
    if (dto.fromMemberId === dto.toMemberId) {
      throw new BadRequestException('Payer and receiver must be different people');
    }
    const prior = await this.settlements.findOne({ groupId: group._id, clientId: dto.clientId }).exec();
    if (prior) return this.presentSettlement(prior);

    await this.groups.requireUsableMembers(group._id, [dto.fromMemberId, dto.toMemberId]);
    try {
      const settlement = await this.settlements.create({
        groupId: group._id,
        clientId: dto.clientId,
        fromMemberId: toObjectId(dto.fromMemberId),
        toMemberId: toObjectId(dto.toMemberId),
        amountPaise: dto.amountPaise,
        settledAt: dto.settledAt ? new Date(dto.settledAt) : new Date(),
        createdByMemberId: member._id,
        deletedAt: null,
      });
      await this.groups.recordActivity(group._id, member._id, 'SETTLEMENT_ADDED', settlement._id, {
        fromMemberId: dto.fromMemberId,
        toMemberId: dto.toMemberId,
        amountPaise: dto.amountPaise,
      });
      return this.presentSettlement(settlement);
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await this.settlements
          .findOne({ groupId: group._id, clientId: dto.clientId })
          .exec();
        if (duplicate) return this.presentSettlement(duplicate);
      }
      throw error;
    }
  }

  async listSettlements(userId: string, groupId: string) {
    const { group } = await this.groups.requireAccess(userId, groupId);
    const rows = await this.settlements
      .find({ groupId: group._id, deletedAt: null })
      .sort({ settledAt: -1, _id: -1 })
      .limit(MAX_LIST)
      .exec();
    return { items: rows.map((row) => this.presentSettlement(row)) };
  }

  async deleteSettlement(userId: string, groupId: string, settlementId: string) {
    const { group, member } = await this.groups.requireAccess(userId, groupId);
    const settlement = await this.settlements
      .findOne({ _id: toObjectId(settlementId), groupId: group._id, deletedAt: null })
      .exec();
    if (!settlement) throw new NotFoundException('Settlement not found');
    this.assertCanChange(settlement.createdByMemberId, member);
    settlement.deletedAt = new Date();
    await settlement.save();
    await this.groups.recordActivity(group._id, member._id, 'SETTLEMENT_DELETED', settlement._id, {
      fromMemberId: settlement.fromMemberId.toString(),
      toMemberId: settlement.toMemberId.toString(),
      amountPaise: settlement.amountPaise,
    });
    return { deleted: true };
  }

  // ---------- helpers ----------

  private async buildParts(groupId: Types.ObjectId, dto: GroupExpenseBodyDto) {
    try {
      const payers = dto.payers.map((p) => ({ memberId: p.memberId, amountPaise: p.amountPaise }));
      validatePayers(dto.amountPaise, payers);
      const shares = computeShares(dto.amountPaise, dto.splitType, dto.splits);
      await this.groups.requireUsableMembers(groupId, [
        ...payers.map((p) => p.memberId),
        ...shares.map((s) => s.memberId),
      ]);
      return {
        title: dto.title.trim(),
        amountPaise: dto.amountPaise,
        categoryKey: dto.categoryKey,
        note: dto.note,
        receiptKey: dto.receiptKey,
        expenseDate: new Date(dto.expenseDate),
        payers: payers.map((p) => ({ memberId: toObjectId(p.memberId), amountPaise: p.amountPaise })),
        splitType: dto.splitType,
        splits: shares.map((s) => ({ memberId: toObjectId(s.memberId), amountPaise: s.amountPaise })),
      };
    } catch (error) {
      if (error instanceof SplitError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async findExpense(groupId: Types.ObjectId, expenseId: string): Promise<GroupExpenseDocument> {
    const expense = await this.expenses
      .findOne({ _id: toObjectId(expenseId), groupId, deletedAt: null })
      .exec();
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private assertCanChange(
    createdByMemberId: Types.ObjectId,
    actor: { _id: Types.ObjectId; role: 'ADMIN' | 'MEMBER' },
  ): void {
    if (actor.role !== 'ADMIN' && !createdByMemberId.equals(actor._id)) {
      throw new ForbiddenException('Only the person who added this, or a group admin, can change it');
    }
  }

  private present(expense: GroupExpenseDocument) {
    return {
      id: expense._id.toString(),
      clientId: expense.clientId,
      title: expense.title,
      amountPaise: expense.amountPaise,
      categoryKey: expense.categoryKey ?? null,
      note: expense.note ?? null,
      receiptKey: expense.receiptKey ?? null,
      expenseDate: expense.expenseDate.toISOString(),
      payers: expense.payers.map((p) => ({ memberId: p.memberId.toString(), amountPaise: p.amountPaise })),
      splitType: expense.splitType,
      splits: expense.splits.map((s) => ({ memberId: s.memberId.toString(), amountPaise: s.amountPaise })),
      createdByMemberId: expense.createdByMemberId.toString(),
      version: expense.version,
    };
  }

  private presentSettlement(settlement: GroupSettlementDocument) {
    return {
      id: settlement._id.toString(),
      clientId: settlement.clientId,
      fromMemberId: settlement.fromMemberId.toString(),
      toMemberId: settlement.toMemberId.toString(),
      amountPaise: settlement.amountPaise,
      settledAt: settlement.settledAt.toISOString(),
      createdByMemberId: settlement.createdByMemberId.toString(),
    };
  }
}

const TRACKED_FIELDS = [
  'title',
  'amountPaise',
  'categoryKey',
  'note',
  'receiptKey',
  'expenseDate',
  'payers',
  'splitType',
  'splits',
] as const;

/** Lists which tracked fields changed, with old and new values, for the activity log. */
function diff(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const field of TRACKED_FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changes[field] = { from: before[field], to: after[field] };
    }
  }
  return changes;
}
