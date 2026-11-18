import {
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthRateLimit, AuthSession, OtpChallenge } from './auth.schema';

const OTP_TTL_MS = 5 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TTL_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(OtpChallenge.name)
    private readonly challenges: Model<OtpChallenge>,
    @InjectModel(AuthSession.name)
    private readonly sessions: Model<AuthSession>,
    @InjectModel(AuthRateLimit.name)
    private readonly rateLimits: Model<AuthRateLimit>,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.challenges.createIndexes(),
      this.sessions.createIndexes(),
      this.rateLimits.createIndexes(),
    ]);
  }

  async requestOtp(dto: RequestOtpDto, ipAddress: string) {
    if (!this.devOtpEnabled()) {
      // No SMS adapter is currently configured. Fail closed in production and
      // in development unless the dedicated development OTP flag is enabled.
      throw new ServiceUnavailableException('OTP delivery is not configured');
    }

    const otpHashSecret = this.requiredSecret('OTP_HASH_SECRET');
    this.requiredSecret('JWT_SECRET');
    const now = new Date();
    const bucketStart = new Date(Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS);
    const expiresAt = new Date(bucketStart.getTime() + RATE_WINDOW_MS + 60_000);
    const phoneKeyHash = hmac(otpHashSecret, `phone:${dto.phoneNumber}`);
    const ipKeyHash = hmac(otpHashSecret, `ip:${ipAddress || 'unknown'}`);
    await this.consumeRateLimit(phoneKeyHash, bucketStart, expiresAt, 3);
    await this.consumeRateLimit(ipKeyHash, bucketStart, expiresAt, 10);

    const otp = randomInt(100000, 1000000).toString();
    const salt = randomBytes(16).toString('hex');
    const requestId = randomUUID();
    const challengeExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
    await this.challenges
      .updateMany(
        { phoneNumber: dto.phoneNumber, consumedAt: null },
        { $set: { consumedAt: now } },
      )
      .exec();
    await this.challenges.create({
      phoneNumber: dto.phoneNumber,
      requestId,
      otpHash: hmac(otpHashSecret, `${salt}:${otp}`),
      otpSalt: salt,
      ipHash: ipKeyHash,
      expiresAt: challengeExpiresAt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      consumedAt: null,
    });

    return {
      requestId,
      expiresAt: challengeExpiresAt.toISOString(),
      ...(this.devOtpEnabled() ? { debugOtp: otp } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    this.requiredSecret('JWT_SECRET');
    this.requiredSecret('OTP_HASH_SECRET');
    const now = new Date();
    const challenge = await this.challenges
      .findOne({
        requestId: dto.requestId,
        phoneNumber: dto.phoneNumber,
        consumedAt: null,
        expiresAt: { $gt: now },
      })
      .exec();
    if (!challenge || challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const suppliedHash = hmac(
      this.requiredSecret('OTP_HASH_SECRET'),
      `${challenge.otpSalt}:${dto.otp}`,
    );
    if (!constantTimeEqual(suppliedHash, challenge.otpHash)) {
      await this.challenges
        .updateOne(
          { _id: challenge._id, consumedAt: null, attempts: { $lt: challenge.maxAttempts } },
          { $inc: { attempts: 1 } },
        )
        .exec();
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const consumed = await this.challenges
      .findOneAndUpdate(
        {
          _id: challenge._id,
          consumedAt: null,
          attempts: { $lt: challenge.maxAttempts },
          expiresAt: { $gt: now },
        },
        { $set: { consumedAt: now } },
        { new: true },
      )
      .exec();
    if (!consumed) throw new UnauthorizedException('Invalid or expired OTP');

    const { user, isNewUser } = await this.users.findOrCreateVerifiedPhone(dto.phoneNumber);
    const session = await this.createSession(user._id);
    return {
      user: {
        id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
      },
      ...session,
      isNewUser,
    };
  }

  async refresh(refreshToken: string) {
    const currentHash = sha256(refreshToken);
    const nextRefreshToken = randomBytes(48).toString('base64url');
    const session = await this.sessions
      .findOneAndUpdate(
        {
          refreshTokenHash: currentHash,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { refreshTokenHash: sha256(nextRefreshToken) } },
        { new: true },
      )
      .exec();
    if (!session) throw new UnauthorizedException('Invalid or expired refresh token');
    return {
      accessToken: this.signAccessToken(session.userId, session._id),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string, sessionId: string, refreshToken?: string): Promise<void> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      revokedAt: null,
    };
    if (refreshToken) filter.refreshTokenHash = sha256(refreshToken);
    else if (Types.ObjectId.isValid(sessionId)) filter._id = new Types.ObjectId(sessionId);
    else return;

    await this.sessions
      .updateOne(filter, { $set: { revokedAt: new Date() } })
      .exec();
  }

  private async createSession(userId: Types.ObjectId) {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    const session = await this.sessions.create({
      userId,
      refreshTokenHash: sha256(refreshToken),
      expiresAt,
      revokedAt: null,
    });
    return {
      accessToken: this.signAccessToken(userId, session._id),
      refreshToken,
    };
  }

  private signAccessToken(userId: Types.ObjectId, sessionId: Types.ObjectId): string {
    const secret = this.requiredSecret('JWT_SECRET');
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = base64Url({
      iss: this.config.get<string>('JWT_ISSUER') || 'kharchiva-api',
      aud: this.config.get<string>('JWT_AUDIENCE') || 'kharchiva-mobile',
      sub: userId.toString(),
      sid: sessionId.toString(),
      tokenUse: 'access',
      iat: issuedAt,
      exp: issuedAt + ACCESS_TTL_SECONDS,
    });
    const input = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(input).digest('base64url');
    return `${input}.${signature}`;
  }

  private async consumeRateLimit(
    keyHash: string,
    bucketStart: Date,
    expiresAt: Date,
    maxRequests: number,
  ): Promise<void> {
    let bucket: { count: number } | null;
    try {
      bucket = await this.rateLimits
        .findOneAndUpdate(
          { keyHash, bucketStart },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      bucket = await this.rateLimits
        .findOneAndUpdate(
          { keyHash, bucketStart },
          { $inc: { count: 1 } },
          { new: true },
        )
        .exec();
    }
    if (!bucket || bucket.count > maxRequests) {
      throw new HttpException('OTP request rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private devOtpEnabled(): boolean {
    const environment = (this.config.get<string>('NODE_ENV') ?? '').toLowerCase();
    return (
      this.config.get<string>('AUTH_DEV_OTP_ENABLED') === 'true' &&
      (environment === 'development' || environment === 'test')
    );
  }

  private requiredSecret(name: string): string {
    const secret = this.config.get<string>(name);
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Authentication is not configured securely');
    }
    return secret;
  }
}

function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
