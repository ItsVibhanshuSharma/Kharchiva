import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RequestOtpDto } from './request-otp.dto';
import { VerifyOtpDto } from './verify-otp.dto';

describe('Phone OTP DTOs', () => {
  it('accepts an Indian phone and six digit code', async () => {
    expect(await validate(plainToInstance(RequestOtpDto, {
      phoneNumber: '+919876543210',
    }))).toHaveLength(0);
    expect(await validate(plainToInstance(VerifyOtpDto, {
      requestId: 'a8101a92-2bc0-4aca-9e25-86c91631d9ad',
      phoneNumber: '+919876543210',
      otp: '123456',
    }))).toHaveLength(0);
  });

  it('rejects invalid phone numbers and malformed OTP values', async () => {
    const invalidPhone = await validate(plainToInstance(RequestOtpDto, {
      phoneNumber: '+12025550123',
    }));
    const invalidOtp = await validate(plainToInstance(VerifyOtpDto, {
      requestId: 'not-a-uuid', phoneNumber: '+919876543210', otp: '1234',
    }));
    expect(invalidPhone.length).toBeGreaterThan(0);
    expect(invalidOtp.length).toBeGreaterThan(0);
  });
});
