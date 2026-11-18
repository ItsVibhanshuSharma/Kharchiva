import 'reflect-metadata';
import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createHmac } from 'node:crypto';
import { Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthSession } from '../auth/auth.schema';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Expense } from './expense.schema';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

interface TestExpense {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: string;
  amountPaise: number;
  deletedAt: Date | null;
  [key: string]: unknown;
}

function signedToken(userId: string, sessionId: string, secret: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({
    iss: 'kharchiva-api',
    aud: 'kharchiva-mobile',
    sub: userId,
    sid: sessionId,
    tokenUse: 'access',
    iat: now,
    exp: now + 60,
  });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('Expenses HTTP integration: authenticated read-by-id', () => {
  const secret = 'test-secret-that-is-long-enough-for-hmac-auth';
  const ownerId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const otherUserId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const sessionId = new Types.ObjectId('507f1f77bcf86cd799439012');
  let app: INestApplication<App>;
  let records: TestExpense[];

  beforeAll(async () => {
    records = [];
    const matches = (record: TestExpense, filter: Record<string, unknown>) => {
      if (filter._id && !record._id.equals(filter._id as Types.ObjectId)) return false;
      if (filter.userId && !record.userId.equals(filter.userId as Types.ObjectId)) return false;
      if (filter.clientId && record.clientId !== filter.clientId) return false;
      if ('deletedAt' in filter && filter.deletedAt === null && record.deletedAt !== null) return false;
      return true;
    };
    const expenseModel = {
      createIndexes: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findOne: jest.fn((filter: Record<string, unknown>) => ({
        exec: async () => records.find(record => matches(record, filter)) ?? null,
      })),
      create: jest.fn(async (data: Record<string, unknown>) => {
        const record = {
          ...data,
          _id: new Types.ObjectId(),
          userId: data.userId as Types.ObjectId,
          clientId: data.clientId as string,
          amountPaise: data.amountPaise as number,
          deletedAt: data.deletedAt as Date | null,
        } satisfies TestExpense;
        records.push(record);
        return record;
      }),
    };
    const sessionModel = {
      findOne: jest.fn(() => ({
        select: () => ({ lean: () => ({ exec: async () => ({ _id: sessionId }) }) }),
      })),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        ExpensesService,
        JwtAuthGuard,
        { provide: ConfigService, useValue: { get: (key: string) => ({
          JWT_SECRET: secret,
          JWT_ISSUER: 'kharchiva-api',
          JWT_AUDIENCE: 'kharchiva-mobile',
        })[key] } },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(AuthSession.name), useValue: sessionModel },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  beforeEach(() => { records.length = 0; });

  afterAll(async () => { await app.close(); });

  const tokenFor = (userId: Types.ObjectId) => signedToken(userId.toString(), sessionId.toString(), secret);

  async function createExpense(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        amountPaise: 12345,
        categoryId: '507f1f77bcf86cd799439014',
        expenseDate: '2026-10-13T10:00:00.000Z',
      })
      .expect(201);
    return response.body.data._id as string;
  }

  it('allows the authenticated owner to read a just-created expense by returned id', async () => {
    const token = tokenFor(ownerId);
    const expenseId = await createExpense(token);
    await request(app.getHttpServer())
      .get(`/api/v1/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data._id).toBe(expenseId);
        expect(body.data.amountPaise).toBe(12345);
      });
  });

  it('hides the expense from a different authenticated user', async () => {
    const expenseId = await createExpense(tokenFor(ownerId));
    await request(app.getHttpServer())
      .get(`/api/v1/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${tokenFor(otherUserId)}`)
      .expect(404);
  });

  it('rejects missing and invalid access tokens', async () => {
    const expenseId = await createExpense(tokenFor(ownerId));
    await request(app.getHttpServer()).get(`/api/v1/expenses/${expenseId}`).expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/expenses/${expenseId}`)
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('does not return soft-deleted expenses as active', async () => {
    const token = tokenFor(ownerId);
    const expenseId = await createExpense(token);
    const stored = records.find(record => record._id.toString() === expenseId);
    if (!stored) throw new Error('test setup failed to create an expense');
    stored.deletedAt = new Date();
    await request(app.getHttpServer())
      .get(`/api/v1/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
