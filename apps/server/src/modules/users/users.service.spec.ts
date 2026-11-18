import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersModel = { findOne: jest.fn(), create: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersModel as never);
  });

  it('returns an existing phone identity without creating a duplicate', async () => {
    const user = {
      _id: 'user-id', phoneNumber: '+919876543210', phoneVerified: true, status: 'ACTIVE',
    };
    usersModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
    await expect(service.findOrCreateVerifiedPhone(user.phoneNumber)).resolves.toEqual({
      user, isNewUser: false,
    });
    expect(usersModel.create).not.toHaveBeenCalled();
  });

  it('creates a verified phone identity for the first successful OTP', async () => {
    const user = { _id: 'new-id', phoneNumber: '+919876543210', phoneVerified: true };
    usersModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    usersModel.create.mockResolvedValue(user);
    await expect(service.findOrCreateVerifiedPhone(user.phoneNumber)).resolves.toEqual({
      user, isNewUser: true,
    });
    expect(usersModel.create).toHaveBeenCalledWith({
      phoneNumber: user.phoneNumber, phoneVerified: true,
    });
  });

  it('does not issue a session for a suspended phone account', async () => {
    usersModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'suspended-id', phoneNumber: '+919876543210',
        phoneVerified: true, status: 'SUSPENDED',
      }),
    });
    await expect(service.findOrCreateVerifiedPhone('+919876543210'))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersModel.create).not.toHaveBeenCalled();
  });
});
