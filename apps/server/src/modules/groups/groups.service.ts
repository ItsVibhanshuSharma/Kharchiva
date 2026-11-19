import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { User } from '../users/user.schema';
import { AddMemberDto, CreateGroupDto, JoinGroupDto, UpdateGroupDto } from './dto/group.dto';
import {
  ActivityAction,
  Group,
  GroupActivity,
  GroupDocument,
  GroupExpense,
  GroupMember,
  GroupMemberDocument,
  GroupSettlement,
} from './group.schemas';
import { computeBalances, simplifyDebts } from './split.util';

export const MAX_GROUP_MEMBERS = 50;

export interface GroupAccess {
  group: GroupDocument;
  member: GroupMemberDocument;
}

@Injectable()
export class GroupsService implements OnModuleInit {
  constructor(
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(GroupMember.name) private readonly members: Model<GroupMember>,
    @InjectModel(GroupExpense.name) private readonly expenses: Model<GroupExpense>,
    @InjectModel(GroupSettlement.name) private readonly settlements: Model<GroupSettlement>,
    @InjectModel(GroupActivity.name) private readonly activities: Model<GroupActivity>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.all(
      [this.groups, this.members, this.expenses, this.settlements, this.activities].map((model) =>
        (model as Model<unknown>).createIndexes(),
      ),
    );
  }

  // ---------- access helpers (shared with GroupExpensesService) ----------

  async requireAccess(userId: string, groupId: string): Promise<GroupAccess> {
    const id = toObjectId(groupId);
    const [group, member] = await Promise.all([
      this.groups.findOne({ _id: id, deletedAt: null }).exec(),
      this.members
        .findOne({ groupId: id, userId: new Types.ObjectId(userId), status: 'ACTIVE' })
        .exec(),
    ]);
    // Same error for "no such group" and "not your group" so ids cannot be probed.
    if (!group || !member) throw new NotFoundException('Group not found');
    return { group, member };
  }

  async requireAdmin(userId: string, groupId: string): Promise<GroupAccess> {
    const access = await this.requireAccess(userId, groupId);
    if (access.member.role !== 'ADMIN') throw new ForbiddenException('Only a group admin can do this');
    return access;
  }

  async recordActivity(
    groupId: Types.ObjectId,
    actorMemberId: Types.ObjectId,
    action: ActivityAction,
    targetId?: Types.ObjectId,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    await this.activities.create({ groupId, actorMemberId, action, targetId, details });
  }

  /** Members who can still be used in new expenses (not removed). */
  async requireUsableMembers(groupId: Types.ObjectId, memberIds: string[]): Promise<void> {
    const unique = [...new Set(memberIds)];
    const count = await this.members.countDocuments({
      groupId,
      _id: { $in: unique.map(toObjectId) },
      status: { $in: ['ACTIVE', 'INVITED'] },
    });
    if (count !== unique.length) throw new BadRequestException('Every member must belong to this group');
  }

  async getBalances(groupId: Types.ObjectId): Promise<Map<string, number>> {
    const [expenses, settlements] = await Promise.all([
      this.expenses.find({ groupId, deletedAt: null }).select('payers splits').lean().exec(),
      this.settlements
        .find({ groupId, deletedAt: null })
        .select('fromMemberId toMemberId amountPaise')
        .lean()
        .exec(),
    ]);
    return computeBalances(
      expenses.map((expense) => ({
        payers: expense.payers.map((p) => ({ memberId: p.memberId.toString(), amountPaise: p.amountPaise })),
        splits: expense.splits.map((s) => ({ memberId: s.memberId.toString(), amountPaise: s.amountPaise })),
      })),
      settlements.map((s) => ({
        fromMemberId: s.fromMemberId.toString(),
        toMemberId: s.toMemberId.toString(),
        amountPaise: s.amountPaise,
      })),
    );
  }

  // ---------- groups ----------

  async create(userId: string, dto: CreateGroupDto) {
    const ownerId = new Types.ObjectId(userId);
    const owner = await this.users.findById(ownerId).select('phoneNumber').lean().exec();
    const group = await this.groups.create({
      title: dto.title.trim(),
      createdByUserId: ownerId,
      inviteCode: newInviteCode(),
      currency: 'INR',
      status: 'ACTIVE',
      deletedAt: null,
    });
    const creator = await this.members.create({
      groupId: group._id,
      userId: ownerId,
      phoneNumber: owner?.phoneNumber ?? null,
      displayName: dto.displayName.trim(),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await this.recordActivity(group._id, creator._id, 'GROUP_CREATED', group._id, { title: group.title });
    const seen = new Set<string>(owner?.phoneNumber ? [owner.phoneNumber] : []);
    for (const invited of dto.members ?? []) {
      if (seen.has(invited.phoneNumber)) continue;
      seen.add(invited.phoneNumber);
      const member = await this.members.create({
        groupId: group._id,
        userId: null,
        phoneNumber: invited.phoneNumber,
        displayName: invited.displayName.trim(),
        role: 'MEMBER',
        status: 'INVITED',
      });
      await this.recordActivity(group._id, creator._id, 'MEMBER_ADDED', member._id, {
        displayName: member.displayName,
      });
    }
    return this.detail(userId, group._id.toString());
  }

  /** Lists the user's groups with their own balance, plus totals for the dashboard card. */
  async list(userId: string) {
    await this.claimPhoneInvites(userId);
    const memberships = await this.members
      .find({ userId: new Types.ObjectId(userId), status: 'ACTIVE' })
      .exec();
    const groups = await this.groups
      .find({ _id: { $in: memberships.map((m) => m.groupId) }, deletedAt: null })
      .sort({ updatedAt: -1 })
      .exec();
    const items = await Promise.all(
      groups.map(async (group) => {
        const membership = memberships.find((m) => m.groupId.equals(group._id))!;
        const [balances, memberCount] = await Promise.all([
          this.getBalances(group._id),
          this.members.countDocuments({ groupId: group._id, status: { $ne: 'REMOVED' } }),
        ]);
        return {
          id: group._id.toString(),
          title: group.title,
          status: group.status,
          memberCount,
          myMemberId: membership._id.toString(),
          myBalancePaise: balances.get(membership._id.toString()) ?? 0,
          updatedAt: group.updatedAt,
        };
      }),
    );
    let youOwePaise = 0;
    let youGetPaise = 0;
    // Completed (closed) groups stay in the list but do not count towards the dashboard.
    const open = items.filter((item) => item.status === 'ACTIVE');
    for (const item of open) {
      if (item.myBalancePaise < 0) youOwePaise += -item.myBalancePaise;
      else youGetPaise += item.myBalancePaise;
    }
    return {
      items,
      summary: { groupCount: open.length, youOwePaise, youGetPaise },
    };
  }

  async detail(userId: string, groupId: string) {
    const { group, member } = await this.requireAccess(userId, groupId);
    const [people, balances] = await Promise.all([
      this.members.find({ groupId: group._id }).sort({ _id: 1 }).exec(),
      this.getBalances(group._id),
    ]);
    return {
      id: group._id.toString(),
      title: group.title,
      status: group.status,
      currency: group.currency,
      inviteCode: group.inviteCode,
      myMemberId: member._id.toString(),
      myRole: member.role,
      members: people.map((person) => ({
        id: person._id.toString(),
        displayName: person.displayName,
        phoneNumber: person.phoneNumber,
        role: person.role,
        status: person.status,
        balancePaise: balances.get(person._id.toString()) ?? 0,
      })),
      transfers: simplifyDebts(balances),
    };
  }

  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    const { group, member } = await this.requireAdmin(userId, groupId);
    if (dto.title !== undefined && dto.title.trim() !== group.title) {
      const from = group.title;
      group.title = dto.title.trim();
      await this.recordActivity(group._id, member._id, 'GROUP_RENAMED', group._id, { from, to: group.title });
    }
    if (dto.status !== undefined && dto.status !== group.status) {
      group.status = dto.status;
      await this.recordActivity(
        group._id,
        member._id,
        dto.status === 'CLOSED' ? 'GROUP_CLOSED' : 'GROUP_REOPENED',
        group._id,
      );
    }
    await group.save();
    return this.detail(userId, groupId);
  }

  async remove(userId: string, groupId: string) {
    const { group } = await this.requireAdmin(userId, groupId);
    group.deletedAt = new Date();
    await group.save();
    return { deleted: true };
  }

  async regenerateInvite(userId: string, groupId: string) {
    const { group } = await this.requireAdmin(userId, groupId);
    group.inviteCode = newInviteCode();
    await group.save();
    return { inviteCode: group.inviteCode };
  }

  // ---------- invites ----------

  /** Public preview shown on the invite landing page. Exposes only the title and head count. */
  async previewInvite(code: string) {
    const group = await this.groups.findOne({ inviteCode: code, deletedAt: null }).exec();
    if (!group) throw new NotFoundException('Invite link is not valid');
    const memberCount = await this.members.countDocuments({ groupId: group._id, status: { $ne: 'REMOVED' } });
    return { title: group.title, memberCount, status: group.status };
  }

  async join(userId: string, code: string, dto: JoinGroupDto) {
    const group = await this.groups.findOne({ inviteCode: code, deletedAt: null }).exec();
    if (!group) throw new NotFoundException('Invite link is not valid');
    const ownerId = new Types.ObjectId(userId);

    const existing = await this.members.findOne({ groupId: group._id, userId: ownerId }).exec();
    if (existing?.status === 'ACTIVE') return this.detail(userId, group._id.toString());
    if (group.status === 'CLOSED') throw new ConflictException('This group is closed');

    const user = await this.users.findById(ownerId).select('phoneNumber').lean().exec();
    const phoneMatch = user?.phoneNumber
      ? await this.members
          .findOne({ groupId: group._id, phoneNumber: user.phoneNumber, status: { $in: ['INVITED', 'REMOVED'] } })
          .exec()
      : null;

    const target = existing ?? phoneMatch;
    if (target) {
      // Reuse the earlier row so old expenses keep pointing at the same member.
      target.userId = ownerId;
      target.status = 'ACTIVE';
      target.phoneNumber = user?.phoneNumber ?? target.phoneNumber;
      if (target.displayName.trim().length === 0) target.displayName = dto.displayName.trim();
      await target.save();
      await this.recordActivity(group._id, target._id, 'MEMBER_JOINED', target._id, {
        displayName: target.displayName,
      });
      return this.detail(userId, group._id.toString());
    }

    const count = await this.members.countDocuments({ groupId: group._id, status: { $ne: 'REMOVED' } });
    if (count >= MAX_GROUP_MEMBERS) throw new ConflictException('This group is full');
    const created = await this.members.create({
      groupId: group._id,
      userId: ownerId,
      phoneNumber: user?.phoneNumber ?? null,
      displayName: dto.displayName.trim(),
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    await this.recordActivity(group._id, created._id, 'MEMBER_JOINED', created._id, {
      displayName: created.displayName,
    });
    return this.detail(userId, group._id.toString());
  }

  /** Turns "invited by phone" rows into real memberships once that phone number logs in. */
  async claimPhoneInvites(userId: string): Promise<void> {
    const ownerId = new Types.ObjectId(userId);
    const user = await this.users.findById(ownerId).select('phoneNumber').lean().exec();
    if (!user?.phoneNumber) return;
    const pending = await this.members
      .find({ phoneNumber: user.phoneNumber, status: 'INVITED', userId: null })
      .exec();
    for (const row of pending) {
      try {
        row.userId = ownerId;
        row.status = 'ACTIVE';
        await row.save();
        await this.recordActivity(row.groupId, row._id, 'MEMBER_JOINED', row._id, {
          displayName: row.displayName,
        });
      } catch (error) {
        // A duplicate means the user already holds another row in that group. Leave this one invited.
        if (!isDuplicateKey(error)) throw error;
      }
    }
  }

  // ---------- members ----------

  async addMember(userId: string, groupId: string, dto: AddMemberDto) {
    const { group, member } = await this.requireAdmin(userId, groupId);
    if (group.status === 'CLOSED') throw new ConflictException('This group is closed');
    const count = await this.members.countDocuments({ groupId: group._id, status: { $ne: 'REMOVED' } });
    if (count >= MAX_GROUP_MEMBERS) throw new ConflictException('This group is full');

    const prior = await this.members.findOne({ groupId: group._id, phoneNumber: dto.phoneNumber }).exec();
    let target: GroupMemberDocument;
    if (prior) {
      if (prior.status !== 'REMOVED') throw new ConflictException('This phone number is already in the group');
      prior.status = prior.userId ? 'ACTIVE' : 'INVITED';
      prior.displayName = dto.displayName.trim();
      target = await prior.save();
    } else {
      target = await this.members.create({
        groupId: group._id,
        userId: null,
        phoneNumber: dto.phoneNumber,
        displayName: dto.displayName.trim(),
        role: 'MEMBER',
        status: 'INVITED',
      });
    }
    await this.recordActivity(group._id, member._id, 'MEMBER_ADDED', target._id, {
      displayName: target.displayName,
    });
    return this.detail(userId, groupId);
  }

  async setRole(userId: string, groupId: string, memberId: string, role: 'ADMIN' | 'MEMBER') {
    const { group } = await this.requireAdmin(userId, groupId);
    const target = await this.findMember(group._id, memberId);
    if (target.status === 'REMOVED') throw new NotFoundException('Member not found');
    if (target.role === 'ADMIN' && role === 'MEMBER') await this.assertAnotherAdmin(group._id, target._id);
    target.role = role;
    await target.save();
    return this.detail(userId, groupId);
  }

  /** Admins can remove anyone. Members can remove themselves (leave). */
  async removeMember(userId: string, groupId: string, memberId: string) {
    const { group, member } = await this.requireAccess(userId, groupId);
    const target = await this.findMember(group._id, memberId);
    if (target.status === 'REMOVED') throw new NotFoundException('Member not found');
    const isSelf = target._id.equals(member._id);
    if (!isSelf && member.role !== 'ADMIN') throw new ForbiddenException('Only a group admin can remove members');

    const balances = await this.getBalances(group._id);
    if ((balances.get(target._id.toString()) ?? 0) !== 0) {
      throw new ConflictException('Settle this member\'s balance before removing them');
    }
    if (target.role === 'ADMIN') await this.assertAnotherAdmin(group._id, target._id);

    target.status = 'REMOVED';
    await target.save();
    await this.recordActivity(group._id, member._id, isSelf ? 'MEMBER_LEFT' : 'MEMBER_REMOVED', target._id, {
      displayName: target.displayName,
    });
    return isSelf ? { left: true } : this.detail(userId, groupId);
  }

  async activity(userId: string, groupId: string, limit: number, cursor?: string) {
    const { group } = await this.requireAccess(userId, groupId);
    const filter: Record<string, unknown> = { groupId: group._id };
    if (cursor) filter._id = { $lt: toObjectId(cursor) };
    const rows = await this.activities.find(filter).sort({ _id: -1 }).limit(limit + 1).lean().exec();
    const page = rows.slice(0, limit);
    const names = new Map(
      (await this.members.find({ groupId: group._id }).select('displayName').lean().exec()).map((m) => [
        m._id.toString(),
        m.displayName,
      ]),
    );
    return {
      items: page.map((row) => ({
        id: row._id.toString(),
        action: row.action,
        actorMemberId: row.actorMemberId.toString(),
        actorName: names.get(row.actorMemberId.toString()) ?? 'Someone',
        targetId: row.targetId?.toString() ?? null,
        details: row.details,
        createdAt: row.createdAt,
      })),
      nextCursor: rows.length > limit ? page[page.length - 1]._id.toString() : null,
    };
  }

  private async findMember(groupId: Types.ObjectId, memberId: string): Promise<GroupMemberDocument> {
    const target = await this.members.findOne({ _id: toObjectId(memberId), groupId }).exec();
    if (!target) throw new NotFoundException('Member not found');
    return target;
  }

  private async assertAnotherAdmin(groupId: Types.ObjectId, exceptMemberId: Types.ObjectId): Promise<void> {
    const others = await this.members.countDocuments({
      groupId,
      role: 'ADMIN',
      status: 'ACTIVE',
      _id: { $ne: exceptMemberId },
    });
    if (others === 0) throw new ConflictException('Make another member admin first');
  }
}

export function toObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value) || !/^[a-f\d]{24}$/i.test(value)) {
    throw new BadRequestException('Invalid id');
  }
  return new Types.ObjectId(value);
}

function newInviteCode(): string {
  return randomBytes(9).toString('base64url');
}

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
