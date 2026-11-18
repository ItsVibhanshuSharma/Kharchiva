import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExpenseDto } from './create-expense.dto';

describe('CreateExpenseDto', () => {
  const valid = {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    amountPaise: 12345,
    categoryId: '507f1f77bcf86cd799439011',
    expenseDate: '2026-10-13T10:00:00.000Z',
  };

  it('accepts integer paise and defaults INR and supported values', async () => {
    const dto = plainToInstance(CreateExpenseDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.currency).toBe('INR');
  });

  it('rejects decimal paise, invalid currency and invalid identifiers', async () => {
    const invalid = plainToInstance(CreateExpenseDto, {
      ...valid,
      amountPaise: 123.45,
      currency: 'USD',
      categoryId: 'not-an-object-id',
    });
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });
});
