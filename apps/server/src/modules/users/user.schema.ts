import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, required: true, match: /^\+91[6-9]\d{9}$/ })
  phoneNumber!: string;

  @Prop({ type: Boolean, required: true, default: false })
  phoneVerified!: boolean;

  @Prop({ type: String, required: true, default: 'INR' })
  currency!: string;

  @Prop({ type: String, required: true, default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: String, required: true, enum: ['ACTIVE', 'SUSPENDED', 'DELETED'], default: 'ACTIVE' })
  status!: 'ACTIVE' | 'SUSPENDED' | 'DELETED';

  @Prop({ type: Boolean, required: true, default: false })
  onboardingCompleted!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ phoneNumber: 1 }, { unique: true });
