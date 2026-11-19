import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { SplitType } from './split.util';

const objectId = mongoose.Schema.Types.ObjectId;

export type GroupDocument = HydratedDocument<Group>;
export type GroupMemberDocument = HydratedDocument<GroupMember>;
export type GroupExpenseDocument = HydratedDocument<GroupExpense>;
export type GroupSettlementDocument = HydratedDocument<GroupSettlement>;
export type GroupActivityDocument = HydratedDocument<GroupActivity>;

@Schema({ timestamps: true, collection: 'groups' })
export class Group {
  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 80 })
  title!: string;

  @Prop({ type: objectId, required: true })
  createdByUserId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  inviteCode!: string;

  @Prop({ type: String, required: true, enum: ['INR'], default: 'INR' })
  currency!: string;

  /** ACTIVE groups accept new expenses. CLOSED groups are read-only (trip finished). */
  @Prop({ type: String, required: true, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' })
  status!: 'ACTIVE' | 'CLOSED';

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  /** Set by the timestamps option. */
  updatedAt?: Date;
}
export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ inviteCode: 1 }, { unique: true });

/**
 * A person in a group. Members added by phone number before they install the app
 * have no userId and status INVITED. They are claimed when that phone number logs in.
 */
@Schema({ timestamps: true, collection: 'group_members' })
export class GroupMember {
  @Prop({ type: objectId, required: true, index: true })
  groupId!: Types.ObjectId;

  @Prop({ type: objectId, default: null })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, default: null, match: /^\+91[6-9]\d{9}$/ })
  phoneNumber!: string | null;

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 60 })
  displayName!: string;

  @Prop({ type: String, required: true, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' })
  role!: 'ADMIN' | 'MEMBER';

  @Prop({ type: String, required: true, enum: ['INVITED', 'ACTIVE', 'REMOVED'], default: 'ACTIVE' })
  status!: 'INVITED' | 'ACTIVE' | 'REMOVED';
}
export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
GroupMemberSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
GroupMemberSchema.index(
  { groupId: 1, phoneNumber: 1 },
  { unique: true, partialFilterExpression: { phoneNumber: { $type: 'string' } } },
);
GroupMemberSchema.index({ userId: 1, status: 1 });
GroupMemberSchema.index({ phoneNumber: 1, status: 1 });

export class MemberAmount {
  memberId!: Types.ObjectId;
  amountPaise!: number;
}
const memberAmountSchema = new mongoose.Schema(
  {
    memberId: { type: objectId, required: true },
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { _id: false },
);

@Schema({ timestamps: true, collection: 'group_expenses' })
export class GroupExpense {
  @Prop({ type: objectId, required: true })
  groupId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  clientId!: string;

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 120 })
  title!: string;

  @Prop({ type: Number, required: true, min: 1, validate: Number.isSafeInteger })
  amountPaise!: number;

  /** Free-form category key such as "food" or "travel". Categories are per user elsewhere, so groups use keys. */
  @Prop({ type: String, maxlength: 40 })
  categoryKey?: string;

  @Prop({ type: String, maxlength: 1000 })
  note?: string;

  /** Storage key of the receipt photo once a storage backend is wired. */
  @Prop({ type: String, maxlength: 300 })
  receiptKey?: string;

  @Prop({ type: Date, required: true })
  expenseDate!: Date;

  @Prop({ type: [memberAmountSchema], required: true })
  payers!: MemberAmount[];

  @Prop({ type: String, required: true, enum: Object.values(SplitType) })
  splitType!: SplitType;

  @Prop({ type: [memberAmountSchema], required: true })
  splits!: MemberAmount[];

  @Prop({ type: objectId, required: true })
  createdByMemberId!: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 1 })
  version!: number;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}
export const GroupExpenseSchema = SchemaFactory.createForClass(GroupExpense);
GroupExpenseSchema.index({ groupId: 1, deletedAt: 1, expenseDate: -1, _id: -1 });
GroupExpenseSchema.index({ groupId: 1, clientId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'group_settlements' })
export class GroupSettlement {
  @Prop({ type: objectId, required: true })
  groupId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  clientId!: string;

  @Prop({ type: objectId, required: true })
  fromMemberId!: Types.ObjectId;

  @Prop({ type: objectId, required: true })
  toMemberId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, validate: Number.isSafeInteger })
  amountPaise!: number;

  @Prop({ type: Date, required: true })
  settledAt!: Date;

  @Prop({ type: objectId, required: true })
  createdByMemberId!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}
export const GroupSettlementSchema = SchemaFactory.createForClass(GroupSettlement);
GroupSettlementSchema.index({ groupId: 1, deletedAt: 1, settledAt: -1 });
GroupSettlementSchema.index({ groupId: 1, clientId: 1 }, { unique: true });

export const ACTIVITY_ACTIONS = [
  'GROUP_CREATED',
  'GROUP_RENAMED',
  'GROUP_CLOSED',
  'GROUP_REOPENED',
  'MEMBER_ADDED',
  'MEMBER_JOINED',
  'MEMBER_REMOVED',
  'MEMBER_LEFT',
  'EXPENSE_ADDED',
  'EXPENSE_EDITED',
  'EXPENSE_DELETED',
  'SETTLEMENT_ADDED',
  'SETTLEMENT_DELETED',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'group_activities' })
export class GroupActivity {
  @Prop({ type: objectId, required: true })
  groupId!: Types.ObjectId;

  @Prop({ type: objectId, required: true })
  actorMemberId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ACTIVITY_ACTIONS })
  action!: ActivityAction;

  /** Expense, settlement or member the action touched. */
  @Prop({ type: objectId })
  targetId?: Types.ObjectId;

  /** Small human-readable snapshot: titles, amounts, and old/new values for edits. */
  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  details!: Record<string, unknown>;

  /** Set by the timestamps option. */
  createdAt?: Date;
}
export const GroupActivitySchema = SchemaFactory.createForClass(GroupActivity);
GroupActivitySchema.index({ groupId: 1, createdAt: -1, _id: -1 });
