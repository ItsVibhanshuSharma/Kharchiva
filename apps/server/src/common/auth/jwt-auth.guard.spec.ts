import { jest } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function mockContext(headers: Record<string, string>) {
  const request: Record<string, unknown> = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
  };
}

function signedToken(secret: string, claims: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('JwtAuthGuard', () => {
  const secret = 's'.repeat(40);
  const userId = '507f1f77bcf86cd799439011';
  const sessionId = '507f1f77bcf86cd799439012';
  const config = {
    get: (key: string) => ({
      JWT_SECRET: secret,
      JWT_ISSUER: 'kharchiva-api',
      JWT_AUDIENCE: 'kharchiva-mobile',
    })[key],
  };
  const sessions = {
    findOne: jest.fn().mockReturnValue({
      select: () => ({ lean: () => ({ exec: async () => ({ _id: sessionId }) }) }),
    }),
  };
  const guard = new JwtAuthGuard(config as never, sessions as never);
  const validClaims = () => {
    const iat = Math.floor(Date.now() / 1000);
    return {
      iss: 'kharchiva-api', aud: 'kharchiva-mobile', sub: userId, sid: sessionId,
      tokenUse: 'access', iat, exp: iat + 60,
    };
  };

  it('derives the authenticated user from a valid signed token and active session', async () => {
    const token = signedToken(secret, validClaims());
    const { context, request } = mockContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessions.findOne).toHaveBeenCalledWith({
      _id: expect.anything(), userId: expect.anything(), revokedAt: null,
      expiresAt: { $gt: expect.any(Date) },
    });
    expect(request.user).toEqual({ id: userId, sessionId });
  });

  it('rejects missing, expired, and invalidly signed tokens', async () => {
    const missing = mockContext({});
    await expect(guard.canActivate(missing.context)).rejects.toBeInstanceOf(UnauthorizedException);

    const expired = signedToken(secret, { ...validClaims(), exp: 1 });
    await expect(guard.canActivate(mockContext({ authorization: `Bearer ${expired}` }).context))
      .rejects.toBeInstanceOf(UnauthorizedException);

    const valid = signedToken(secret, validClaims());
    await expect(guard.canActivate(mockContext({ authorization: `Bearer ${valid}x` }).context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects wrong issuer, audience, purpose, and overly long expiry', async () => {
    const invalidClaims = [
      { ...validClaims(), iss: 'other' },
      { ...validClaims(), aud: 'other' },
      { ...validClaims(), tokenUse: 'refresh' },
      { ...validClaims(), exp: Math.floor(Date.now() / 1000) + 3600 },
    ];
    for (const claims of invalidClaims) {
      const token = signedToken(secret, claims);
      await expect(guard.canActivate(mockContext({ authorization: `Bearer ${token}` }).context))
        .rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('rejects an otherwise valid token after session revocation', async () => {
    sessions.findOne.mockReturnValueOnce({
      select: () => ({ lean: () => ({ exec: async () => null }) }),
    });
    const token = signedToken(secret, validClaims());
    await expect(guard.canActivate(mockContext({ authorization: `Bearer ${token}` }).context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
