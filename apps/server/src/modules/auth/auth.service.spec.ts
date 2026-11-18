import { jest } from '@jest/globals';
import {
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';

function hmac(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function query(value: unknown) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('AuthService', () => {
  const phoneNumber = '+919876543210';
  const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const sessionId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const otpSecret = 'o'.repeat(40);
  const jwtSecret = 'j'.repeat(40);
  const configValues: Record<string, string> = {
    AUTH_DEV_OTP_ENABLED: 'true',
    NODE_ENV: 'test',
    OTP_HASH_SECRET: otpSecret,
    JWT_SECRET: jwtSecret,
    JWT_ISSUER: 'kharchiva-api',
    JWT_AUDIENCE: 'kharchiva-mobile',
  };
  const challengeModel = {
    createIndexes: jest.fn(), create: jest.fn(), findOne: jest.fn(),
    updateOne: jest.fn(), updateMany: jest.fn(), findOneAndUpdate: jest.fn(),
  };
  const sessionModel = {
    createIndexes: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(),
  };
  const rateModel = { createIndexes: jest.fn(), findOneAndUpdate: jest.fn() };
  const users = { findOrCreateVerifiedPhone: jest.fn() };
  const config = { get: (key: string) => configValues[key] };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    configValues.AUTH_DEV_OTP_ENABLED = 'true';
    configValues.NODE_ENV = 'test';
    rateModel.findOneAndUpdate.mockReturnValue(query({ count: 1 }));
    challengeModel.updateMany.mockReturnValue(query({ modifiedCount: 0 }));
    service = new AuthService(
      challengeModel as never,
      sessionModel as never,
      rateModel as never,
      users as never,
      config as never,
    );
  });

  it('creates a hashed development OTP with expiry and returns it only under the dev flag', async () => {
    challengeModel.create.mockResolvedValue({});
    const result = await service.requestOtp({ phoneNumber }, '127.0.0.1');
    expect(result.requestId).toMatch(/^[\da-f-]{36}$/i);
    expect(result.debugOtp).toMatch(/^\d{6}$/);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const saved = challengeModel.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(saved.otpHash).not.toBe(result.debugOtp);
    expect(saved).not.toHaveProperty('otp');
    expect(saved).toMatchObject({ attempts: 0, maxAttempts: 5, consumedAt: null });
    expect(rateModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('fails safely in production when no SMS provider adapter is configured', async () => {
    configValues.NODE_ENV = 'production';
    await expect(service.requestOtp({ phoneNumber }, 'ip')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(challengeModel.create).not.toHaveBeenCalled();
  });

  it('enforces OTP request rate limits', async () => {
    rateModel.findOneAndUpdate.mockReturnValue(query({ count: 4 }));
    let caught: unknown;
    try {
      await service.requestOtp({ phoneNumber }, 'ip');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(429);
    expect(challengeModel.create).not.toHaveBeenCalled();
  });

  it('rejects expired or missing OTP challenges', async () => {
    challengeModel.findOne.mockReturnValue(query(null));
    await expect(service.verifyOtp({
      requestId: 'a8101a92-2bc0-4aca-9e25-86c91631d9ad', phoneNumber, otp: '123456',
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('increments attempts and rejects an incorrect OTP, then blocks exhausted challenges', async () => {
    const challenge = {
      _id: new Types.ObjectId(), otpSalt: 'salt', otpHash: hmac(otpSecret, 'salt:654321'),
      attempts: 0, maxAttempts: 5,
    };
    challengeModel.findOne.mockReturnValue(query(challenge));
    challengeModel.updateOne.mockReturnValue(query({ modifiedCount: 1 }));
    await expect(service.verifyOtp({
      requestId: 'a8101a92-2bc0-4aca-9e25-86c91631d9ad', phoneNumber, otp: '123456',
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(challengeModel.updateOne).toHaveBeenCalledWith(
      { _id: challenge._id, consumedAt: null, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
    );

    challenge.attempts = 5;
    await expect(service.verifyOtp({
      requestId: 'a8101a92-2bc0-4aca-9e25-86c91631d9ad', phoneNumber, otp: '654321',
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('consumes a valid OTP once, resolves the user, and issues access and refresh tokens', async () => {
    const otp = '483920';
    const challenge = {
      _id: new Types.ObjectId(), otpSalt: 'salt', otpHash: hmac(otpSecret, `salt:${otp}`),
      attempts: 0, maxAttempts: 5,
    };
    challengeModel.findOne.mockReturnValue(query(challenge));
    challengeModel.findOneAndUpdate.mockReturnValue(query(challenge));
    users.findOrCreateVerifiedPhone.mockResolvedValue({
      user: { _id: userId, phoneNumber, phoneVerified: true }, isNewUser: true,
    });
    sessionModel.create.mockResolvedValue({ _id: sessionId });

    const result = await service.verifyOtp({
      requestId: 'a8101a92-2bc0-4aca-9e25-86c91631d9ad', phoneNumber, otp,
    });
    expect(challengeModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: challenge._id, consumedAt: null }),
      { $set: { consumedAt: expect.any(Date) } },
      { new: true },
    );
    expect(users.findOrCreateVerifiedPhone).toHaveBeenCalledWith(phoneNumber);
    expect(sessionModel.create).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      refreshTokenHash: expect.any(String),
      revokedAt: null,
    }));
    const [header, payload, signature] = result.accessToken.split('.');
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toMatchObject({
      iss: 'kharchiva-api', aud: 'kharchiva-mobile', sub: userId.toString(),
      sid: sessionId.toString(), tokenUse: 'access',
    });
    expect(signature).toBe(
      createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url'),
    );
    expect(result.refreshToken).toHaveLength(64);
    expect(result.isNewUser).toBe(true);
  });

  it('rotates refresh credentials and rejects replay', async () => {
    const oldToken = 'x'.repeat(64);
    sessionModel.findOneAndUpdate.mockReturnValueOnce(query({ _id: sessionId, userId }))
      .mockReturnValueOnce(query(null));
    const rotated = await service.refresh(oldToken);
    expect(rotated.refreshToken).not.toBe(oldToken);
    expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ refreshTokenHash: createHash('sha256').update(oldToken).digest('hex') }),
      { $set: { refreshTokenHash: expect.any(String) } },
      { new: true },
    );
    await expect(service.refresh(oldToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the authenticated session at logout without exposing token data', async () => {
    sessionModel.updateOne.mockReturnValue(query({ modifiedCount: 1 }));
    await expect(service.logout(userId.toString(), sessionId.toString())).resolves.toBeUndefined();
    expect(sessionModel.updateOne).toHaveBeenCalledWith(
      { userId, revokedAt: null, _id: sessionId },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });
});
