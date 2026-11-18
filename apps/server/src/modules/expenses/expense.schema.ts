import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { ExpenseSource, ExpenseType } from './dto/create-expense.dto';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true, collection: 'expenses' })
export class Expense {
  @Prop({ type: String, required: true })
  clientId!: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, validate: Number.isSafeInteger })
  amountPaise!: number;

  @Prop({ type: String, required: true, enum: ['INR'], default: 'INR' })
  currency!: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  categoryId!: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId })
  paymentSourceId?: Types.ObjectId;

  @Prop({ type: String, maxlength: 160 })
  merchant?: string;

  @Prop({ type: String, maxlength: 2000 })
  note?: string;

  @Prop({ type: String, enum: Object.values(ExpenseType), default: ExpenseType.PERSONAL })
  type!: ExpenseType;

  @Prop({ type: Date, required: true })
  expenseDate!: Date;

  @Prop({ type: String, enum: Object.values(ExpenseSource), default: ExpenseSource.MANUAL })
  source!: ExpenseSource;

  @Prop({ type: Number, required: true, default: 1 })
  version!: number;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ userId: 1, expenseDate: -1, _id: -1 });
ExpenseSchema.index({ userId: 1, categoryId: 1, expenseDate: -1 });
ExpenseSchema.index({ userId: 1, paymentSourceId: 1, expenseDate: -1 });
ExpenseSchema.index({ userId: 1, createdAt: -1 });
ExpenseSchema.index({ userId: 1, clientId: 1 }, { unique: true });
