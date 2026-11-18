import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { Request } from 'express';
import { AuthSession } from '../../modules/auth/auth.schema';

export interface AuthenticatedRequest extends Request {
  user: { id: string; sessionId: string };
}

interface JwtPayload {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  sid?: unknown;
  tokenUse?: unknown;
  iat?: unknown;
  exp?: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(AuthSession.name)
    private readonly sessions: Model<AuthSession>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Authentication is not configured');
    }
    if (secret.length < 32) {
      throw new UnauthorizedException('Authentication is not configured securely');
    }

    const token = authorization.slice('Bearer '.length);
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid access token');
    }

    let userId: string;
    let sessionId: string;
    try {
      const header = JSON.parse(decodePart(parts[0])) as { alg?: unknown; typ?: unknown };
      if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        throw new Error('Unsupported token algorithm');
      }
      const expectedSignature = createSignature(`${parts[0]}.${parts[1]}`, secret);
      const supplied = Buffer.from(parts[2], 'base64url');
      const expected = Buffer.from(expectedSignature, 'base64url');
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        throw new Error('Invalid signature');
      }

      const payload = JSON.parse(decodePart(parts[1])) as JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const issuer = this.config.get<string>('JWT_ISSUER') || 'kharchiva-api';
      const audience = this.config.get<string>('JWT_AUDIENCE') || 'kharchiva-mobile';
      if (
        payload.iss !== issuer ||
        payload.aud !== audience ||
        typeof payload.sub !== 'string' ||
        !/^[a-f\d]{24}$/i.test(payload.sub) ||
        typeof payload.sid !== 'string' ||
        !/^[a-f\d]{24}$/i.test(payload.sid) ||
        payload.tokenUse !== 'access' ||
        typeof payload.iat !== 'number' ||
        payload.iat > now + 30 ||
        typeof payload.exp !== 'number' ||
        payload.exp <= now ||
        payload.exp <= payload.iat ||
        payload.exp - payload.iat > 15 * 60
      ) {
        throw new Error('Invalid token claims');
      }
      userId = payload.sub;
      sessionId = payload.sid;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const activeSession = await this.sessions
      .findOne({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .select('_id')
      .lean()
      .exec();
    if (!activeSession) throw new UnauthorizedException('Invalid or expired access token');
    request.user = { id: userId, sessionId };
    return true;
  }
}

function decodePart(part: string): string {
  return Buffer.from(part, 'base64url').toString('utf8');
}

function createSignature(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}
