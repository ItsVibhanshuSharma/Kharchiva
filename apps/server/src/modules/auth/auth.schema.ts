import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OtpChallengeDocument = HydratedDocument<OtpChallenge>;

@Schema({ timestamps: true, collection: 'otp_challenges' })
export class OtpChallenge {
  @Prop({ type: String, required: true, index: true })
  phoneNumber!: string;

  @Prop({ type: String, required: true, unique: true })
  requestId!: string;

  @Prop({ type: String, required: true })
  otpHash!: string;

  @Prop({ type: String, required: true })
  otpSalt!: string;

  @Prop({ type: String, required: true })
  ipHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Number, required: true })
  maxAttempts!: number;

  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpChallengeSchema.index({ phoneNumber: 1, createdAt: -1 });
OtpChallengeSchema.index({ ipHash: 1, createdAt: -1 });

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({ timestamps: true, collection: 'auth_sessions' })
export class AuthSession {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  refreshTokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });

export type AuthRateLimitDocument = HydratedDocument<AuthRateLimit>;

@Schema({ timestamps: true, collection: 'auth_rate_limits' })
export class AuthRateLimit {
  @Prop({ type: String, required: true })
  keyHash!: string;

  @Prop({ type: Date, required: true })
  bucketStart!: Date;

  @Prop({ type: Number, required: true, default: 0 })
  count!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const AuthRateLimitSchema = SchemaFactory.createForClass(AuthRateLimit);
AuthRateLimitSchema.index({ keyHash: 1, bucketStart: 1 }, { unique: true });
AuthRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
