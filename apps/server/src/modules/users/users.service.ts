import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async onModuleInit(): Promise<void> {
    await this.users.createIndexes();
  }

  async findOrCreateVerifiedPhone(phoneNumber: string): Promise<{ user: UserDocument; isNewUser: boolean }> {
    const existing = await this.users.findOne({ phoneNumber }).exec();
    if (existing) {
      if (existing.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
      if (!existing.phoneVerified) {
        existing.phoneVerified = true;
        await existing.save();
      }
      return { user: existing, isNewUser: false };
    }
    try {
      const user = await this.users.create({ phoneNumber, phoneVerified: true });
      return { user, isNewUser: true };
    } catch (error) {
      if (isDuplicateKey(error)) {
        const raced = await this.users.findOne({ phoneNumber }).exec();
        if (raced?.status === 'ACTIVE') return { user: raced, isNewUser: false };
      }
      throw error;
    }
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
